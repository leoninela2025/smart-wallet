import { config } from "dotenv";
import { Hex } from "viem";
import { decodeXPaymentResponse, wrapFetchWithPayment } from "x402-fetch";
import { LocalAccountSigner } from "@aa-sdk/core";
import { Wallet } from "x402/types";

export async function fetchWithX402Payment<T>(
    privateKey: Hex,
    baseURL: string,
    endpointPath: string
): Promise<T | void> {
    if (!baseURL || !privateKey || !endpointPath) {
        console.error("Missing required parameters");
        return;
    }

    const url = `${baseURL}${endpointPath}`;
    const account = LocalAccountSigner.privateKeyToAccountSigner(privateKey);
    const wallet: Wallet = account.inner;


    const fetchWithPayment = wrapFetchWithPayment(fetch, wallet);

    try {
        const response = await fetchWithPayment(url, { method: "GET" });
        if (!response.ok) {
            console.error(`Request failed with status ${response.status}`);
            return;
        }
        const body: T = await response.json();
        console.log(body);

        const paymentHeader = response.headers.get("x-payment-response");
        if (paymentHeader) {
            const paymentResponse = decodeXPaymentResponse(paymentHeader);
            console.log(paymentResponse);
        }

        return body;
    } catch (error: any) {
        console.log(error);
        console.error(error.response?.data?.error);
        return;
    }
}
