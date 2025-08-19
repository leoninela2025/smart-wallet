import { LocalAccountSigner } from "@aa-sdk/core";
import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";
import { fetchWithX402Payment } from "./x402-client";



type Response = {
    success: boolean;
    transaction?: string;
    errorReason?: string;
    network: string;
    payer: string;
}
type SessionKeyData = {
    id: string;
    address: string;
    privateKey: string;
    sessionEntityId: number;
    hookEntityId: number;
    smartWalletAddress: string;
  };

export async function POST(request: Request) {

    try {

        const raw = fs.readFileSync("client.json", "utf-8");
        const client = JSON.parse(raw);


        console.log("Using account:", client, typeof client);


        const { sessionId, resourceUrl, endpointPath } = await request.json();
    
        if (!resourceUrl || !sessionId || !endpointPath) {
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

        const response = await fetchWithX402Payment(
            session.privateKey as `0x${string}`,
            resourceUrl,
            endpointPath
        );

        if (
            !response ||
            typeof response !== "object" ||
            response === null ||
            !("transaction" in response)
        ) {
            return NextResponse.json({ error: "Failed to fetch payment response" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            transactionHash: (response as { transaction: string }).transaction,
        });
    } catch (error) {
        console.error("Error making transaction using facilitator:", error);
        return NextResponse.json({ error: "Failed to make transaction" }, { status: 500 });
    }
}