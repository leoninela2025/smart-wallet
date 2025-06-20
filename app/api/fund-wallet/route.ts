import { NextResponse, type NextRequest } from "next/server";
import {
  createWalletClient,
  http,
  parseUnits,
  type Address,
  erc20Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { USDC_CONTRACT_ADDRESS } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const { recipient } = await req.json();

  if (!recipient) {
    return NextResponse.json({ error: "Recipient address is required" }, { status: 400 });
  }

  const treasuryPrivateKey = process.env.TREASURY_PRIVATE_KEY;
  if (!treasuryPrivateKey) {
    return NextResponse.json({ error: "Treasury private key not configured" }, { status: 500 });
  }

  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!rpcUrl) {
    return NextResponse.json({ error: "Sepolia RPC URL not configured" }, { status: 500 });
  }

  console.log("Using RPC URL:", rpcUrl);

  // This is a common USDC contract address on Sepolia.
  // You can find official testnet addresses on the Circle developer documentation.
  const AMOUNT_TO_SEND = parseUnits("1", 6); // Sending 1 USDC

  const account = privateKeyToAccount(treasuryPrivateKey as `0x${string}`);

  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  try {
    const txHash = await client.writeContract({
      address: USDC_CONTRACT_ADDRESS,
      abi: erc20Abi,
      functionName: "transfer",
      args: [recipient as Address, AMOUNT_TO_SEND],
    });

    return NextResponse.json({ txHash });
  } catch (error) {
    console.error("Funding transaction failed:", error);
    return NextResponse.json({ error: "Funding transaction failed" }, { status: 500 });
  }
} 