import { NextResponse } from "next/server";
import { getSessionKey } from "@/lib/session-store";
import { type Address } from "viem";

export async function POST(request: Request) {
  try {
    const { address } = await request.json() as { address: Address };
    const privateKey = await getSessionKey(address);
    
    if (!privateKey) {
      return NextResponse.json(
        { error: "Session key not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ privateKey });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to retrieve session key" },
      { status: 500 }
    );
  }
} 