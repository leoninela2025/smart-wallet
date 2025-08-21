import { LocalAccountSigner } from "@aa-sdk/core";
import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";
import { decodeXPaymentResponse, wrapFetchWithPayment } from "x402-fetch";

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

        const url = `${resourceUrl}${endpointPath}`;
        const account = LocalAccountSigner.privateKeyToAccountSigner(session.privateKey as `0x${string}`);
        const wallet = account.inner;

        const fetchWithPayment = wrapFetchWithPayment(fetch, wallet);

        try {
            const response = await fetchWithPayment(url, {
                method: "GET",
            });

            const body = await response.json();
            console.log(body);

            const paymentResponse = decodeXPaymentResponse(response.headers.get("x-payment-response")!);
            console.log(paymentResponse);

            return NextResponse.json(body, { status: 200 });
        } catch (error: any) {
            console.log(error);
            console.error(error.response?.data?.error);
            return NextResponse.json({ error: "Failed to make transaction" }, { status: 500 });
        }
    } catch (error) {
        console.error("Error making transaction using facilitator:", error);
        return NextResponse.json({ error: "Failed to make transaction" }, { status: 500 });
    }
}