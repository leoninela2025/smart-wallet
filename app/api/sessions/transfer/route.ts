import { NextResponse } from "next/server";
import { createModularAccountV2Client } from "@account-kit/smart-contracts";
import { alchemyFeeEstimator } from "@account-kit/infra";
import { LocalAccountSigner, wrapSignatureWith6492 } from "@aa-sdk/core";
import { encodeFunctionData } from "viem";
import { baseSepolia, alchemy } from "@account-kit/infra";
import fs from "fs";
import path from "path";
import { USDC_ABI, USDC_CONTRACT_ADDRESS } from "../../../../lib/constants";
import {randomBytes} from "crypto";
import { Hex, isErc6492Signature } from "viem";
import { parseFactoryAddressFromAccountInitCode } from "@aa-sdk/core";
import { fetchWithX402Payment } from "../x402Settle/x402-client";



type SessionKeyData = {
    id: string;
    address: string;
    privateKey: string;
    sessionEntityId: number;
    hookEntityId: number;
    smartWalletAddress: string;
  };

const chainIdToX402Network = (caip2Id: string): "base-sepolia" | "base" | "avalanche-fuji" | "avalanche" | undefined => {
    const numericId = parseInt(caip2Id.split(":")[1], 10);
    const mapping: Record<number, "base-sepolia" | "base" | "avalanche-fuji" | "avalanche"> = {
    84532: "base-sepolia",
    8453: "base",
    43113: "avalanche-fuji",
    43114: "avalanche"
    };
    return mapping[numericId];
};

export const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"

const X402_FACILITATOR_URL = "http://localhost:3002"


export async function POST(request: Request) {

    try {

        const raw = fs.readFileSync("client.json", "utf-8");
        const client = JSON.parse(raw);


        console.log("Using account:", client, typeof client);


        const { sessionId, amount, recipient } = await request.json();
    
        if (!sessionId || !amount || !recipient) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
    
        // Read session keys from JSON file
        const filePath = path.join(process.cwd(), 'session-keys.json');
        const sessions = JSON.parse(await fs.promises.readFile(filePath, 'utf-8')) as SessionKeyData[];
    
        // Find session by sessionId
        const session = sessions.find((s) => s.id === sessionId);
    
        if (!session) {
            return NextResponse.json(
                { error: "Session not found" },
                { status: 404 }
            );
        }
    
        const sessionKeySigner = LocalAccountSigner.privateKeyToAccountSigner(
            session.privateKey as `0x${string}`
        );
    
        const validAfterTimestamp = BigInt(Math.floor(Date.now() / 1000) - 60);
        const deadlineTimestamp = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour deadline
    
        // The nonce for `transferWithAuthorization` must be a unique `bytes32` value to prevent replay attacks.
        // We generate a random one here. This is different from the sequential `uint256` nonce used by the `permit` function.
        const nonceForSigning = `0x${randomBytes(32).toString("hex")}` as Hex;
    
        const messageToSign = {
            from: session.address as `0x${string}`,
            to: recipient as `0x${string}`, // The recipient of the funds
            value: BigInt(amount),
            validAfter: validAfterTimestamp,
            validBefore: deadlineTimestamp,
            nonce: nonceForSigning
        };
    
        const domain = {
            name: "USDC",
            version: "2", // Ensure this version matches what the USDC contract expects for this type of signature
            chainId: BigInt(84532),
            verifyingContract: usdcAddress
        } as const
    
        // types expected by the facilitator for TransferWithAuthorization
        const transferAuthorisationTypes = {
            TransferWithAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" } // Facilitator expects bytes32 nonce in the message
            ]
        } as const;
    
        const x402Authorization = {
            from: messageToSign.from,
            to: messageToSign.to,
            value: messageToSign.value.toString(),
            validAfter: messageToSign.validAfter.toString(),
            validBefore: messageToSign.validBefore.toString(),
            nonce: messageToSign.nonce // This is already a hex string (bytes32)
        };
    
        
        
        
        const signatureOriginal = await sessionKeySigner.signTypedData({
            domain,
            types: transferAuthorisationTypes,
            primaryType: "TransferWithAuthorization",
            message: messageToSign
            
        })
        const [factoryAddress, factoryCallData] = parseFactoryAddressFromAccountInitCode("0x00000000000017c61b5bEe81050EC8eFc9c6fecd");
    
        const signature = wrapSignatureWith6492({
            factoryAddress: factoryAddress,
            factoryCalldata: factoryCallData,
            signature: signatureOriginal
        });
        
        console.log("Signature:", signature, isErc6492Signature(signature) ? "is EIP-6492 signature" : "is not EIP-6492 signature");
        
        const x402EvmPayload = {
            signature: signature,
            authorization: x402Authorization
        };
    
        const x402NetworkString = chainIdToX402Network("eip155:84532") || "base-sepolia";
    
        const x402PaymentPayload = {
            x402Version: 1,
            scheme: "exact" as const,
            network: x402NetworkString!,
            payload: x402EvmPayload
        };
    
        // --- Construct x402PaymentRequirements ---
      // finalRecipientAddress is now calculated before signing
      const descriptionForRequirements = `Payment for x402 response`;
      // Use paymentOption.receiptService as resource URL, or a more specific one if available
      // For example, if paymentRequest.serviceCallback is a URL and more appropriate.
      // Using paymentOption.receiptService ensures a URL is present.
      const resourceForRequirements = process.env.PAYMENT_SERVICE;
    
      const x402PaymentRequirements = {
        scheme: "exact" as const,
        network: x402NetworkString!,
        maxAmountRequired: amount.toString(),
        resource: resourceForRequirements,
        description: descriptionForRequirements,
        mimeType: "application/json",
        payTo: recipient,
        maxTimeoutSeconds: 60,
        asset: usdcAddress,
        extra: { // For EIP-712 domain details, matching what was signed
          name: "USDC",
          version: domain.version // Use the same version as in the signed domain
        }
      };
    
      const facilitatorResponse = await fetch(`${X402_FACILITATOR_URL}/settle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          paymentPayload: x402PaymentPayload,
          paymentRequirements: x402PaymentRequirements
        })
      })

      const response = await facilitatorResponse.json()

    
      console.log("Facilitator Response:", facilitatorResponse.status, response);

      return NextResponse.json({
            success: true,
            transactionHash: response.transaction,
        });
    } catch (error) {
        console.error("Error making transaction using facilitator:", error);
        return NextResponse.json({ error: "Failed to make transaction" }, { status: 500 });
    }
}