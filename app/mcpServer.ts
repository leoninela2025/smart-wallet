import { FastMCP, UserError } from "fastmcp";
import { z } from "zod";
import 'dotenv/config'

const paymentService = process.env.PAYMENT_SERVICE;
const server = new FastMCP({
  name: "logistics-server",
  version: "1.0.0",
});

function isNonEmptyString(value: string): boolean {
  return value !== undefined && value.trim().length > 0;
}

async function makeLogisticsApiCall(url: string, watchId: number, receiptToken: string) {
  try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(isNonEmptyString(receiptToken) && {
          Authorization: `Bearer ${receiptToken}`,
        }),
      };

      const res = await fetch(url, {
        method: "POST",
        headers,
      });

      const data = await res.json();
      if (res.status === 402) {

        const paymentOption = data.paymentRequest.paymentOptions[0];
  
        return JSON.stringify({
          status: 402,
          message: `Successfully called ${url}`,
          paymentToken: data.paymentToken,
          recipient: paymentOption.recipient,
          amount: paymentOption.amount / 10 ** paymentOption.decimals,
        });
      } else {
        return JSON.stringify(data);
      }
    } catch (error) {
      return JSON.stringify({
        error: "Internal server error",
        details: (error as Error).message,
      });
    }
}


server.addTool({
  name: "getDeliveryEstimate",
  description: "Provides a delivery estimate for the given watch Id",
  parameters: z.object({
    watchId: z.number().describe("Watch ID"),
    receiptToken: z.string().optional().describe("Receipt token for verification"),
  }),
  execute: async ({ watchId, receiptToken }) => {
    const url = `${paymentService}/logistics/quote/${watchId}`;
    return await makeLogisticsApiCall(url, watchId, receiptToken)
  },
});

server.addTool({
  name: "getWarrantyCheck",
  description: "Provides a warranty check for the given watch Id",
  parameters: z.object({
    watchId: z.number().describe("Watch ID"),
    receiptToken: z.string().optional().describe("Receipt token for verification"),
  }),
  execute: async ({ watchId, receiptToken }) => {
    const url = `${paymentService}/warranty/check/${watchId}`;
    return await makeLogisticsApiCall(url, watchId, receiptToken)
  },
});

server.start({
  transportType: "httpStream",
  httpStream: {
    port: 8080,
  },
});
