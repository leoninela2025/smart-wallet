import { NextResponse } from "next/server";
import { createModularAccountV2Client } from "@account-kit/smart-contracts";
import { LocalAccountSigner } from "@aa-sdk/core";
import { encodeFunctionData } from "viem";
import { baseSepolia, alchemy } from "@account-kit/infra";
import fs from "fs";
import path from "path";
import { USDC_ABI, USDC_CONTRACT_ADDRESS } from "../../../../lib/constants";


type SessionKeyData = {
    id: string;
    address: string;
    privateKey: string;
    sessionEntityId: number;
    hookEntityId: number;
  };

export async function POST(request: Request) {
    const { accountAddress, sessionId, amount, recipient } = await request.json();

    if (!accountAddress || !sessionId || !amount || !recipient) {
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

    const sessionKeyClient = await createModularAccountV2Client({
        chain: baseSepolia,
        transport: alchemy({
            apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || ""
        }),
        signer: sessionKeySigner,
        accountAddress: accountAddress,
        signerEntity: {
            entityId: session.sessionEntityId,
            isGlobalValidation: false,
        },
        policyId: process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID ?? "default_policy",
    });

    try {
        const result = await sessionKeyClient.sendUserOperation({
            uo: {
              target: USDC_CONTRACT_ADDRESS,
              data: encodeFunctionData({
                abi: USDC_ABI,
                functionName: "transfer",
                args: [recipient, BigInt(Math.floor(amount * 1e6))],
              }),
            },
          });

        const receipt = await sessionKeyClient.waitForUserOperationTransaction(result);

        return NextResponse.json({
            success: true,
            transactionHash: receipt,
        });
    } catch (error) {
        console.error("Error sending user operation:", error);
        return NextResponse.json({ error: "Failed to send user operation" }, { status: 500 });
    }
}