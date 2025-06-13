import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Bot, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { useSmartAccountClient } from "@account-kit/react";
import { encodeFunctionData, type Address, type Hex } from "viem";
import { LocalAccountSigner } from "@aa-sdk/core";
import { privateKeyToAccount } from "viem/accounts";
import { createModularAccountV2Client } from "@account-kit/smart-contracts";
import { alchemy, baseSepolia } from "@account-kit/infra";
import { USDC_ABI, USDC_CONTRACT_ADDRESS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// This is a hardcoded address for demo purposes.
// In a real app, this would be dynamic.
const RECIPIENT_ADDRESS = "0x531d45E22D24bdACbB23C5004A1C64588B1E7f26";
const USDC_AMOUNT = 0.03;

export default function UsdcTransferCard() {
  const [instruction, setInstruction] = useState(`transfer ${USDC_AMOUNT} usdc to ${RECIPIENT_ADDRESS}`);
  const [isSending, setIsSending] = useState(false);
  const [error, setError]       = useState<string | undefined>();
  const [txUrl, setTxUrl]       = useState<string>();
  const [amount, setAmount]     = useState<number>();
  const [recipient, setRecip]   = useState<Address>();
  const { client }              = useSmartAccountClient({});

  useEffect(() => {
    const regex = /([\d.]+)\s*usdc.*(0x[a-fA-F0-9]{40})/i;
    const m = instruction.match(regex);
    if (m) {
      setAmount(parseFloat(m[1]));
      setRecip(m[2] as Address);
    }
  }, [instruction]);

  const sessionKeyClient = useMemo(async () => {
    const pk = localStorage.getItem("aiAgentPrivateKey") as Hex | null;
    const ent = Number(localStorage.getItem("sessionKeyEntityId") ?? 1);
    if (!pk || !client || !client.account) return;
    return createModularAccountV2Client({
      chain: client.chain ?? baseSepolia, // Provide fallback chain
      transport: alchemy({ 
        apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? "default_key"
      }),
      signer: new LocalAccountSigner(privateKeyToAccount(pk)),
      signerEntity: { entityId: ent, isGlobalValidation: false },
      accountAddress: client.account.address,
      mode: "default",
      policyId: process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID ?? "default_policy",
    });
  }, [client]);

  const handleSend = async () => {
    const client = await sessionKeyClient;
    console.log('Client:', client);
    console.log('Client Signer:', client?.account.getSigner());
    if (!client || !amount || !recipient) {
      setError("Unable to parse instruction or missing key");
      return;
    }
    setIsSending(true);
    setError(undefined);
    let uoHash: Hex | undefined;
    
    try {
      const result = await client.sendUserOperation({
        uo: {
          target: USDC_CONTRACT_ADDRESS,
          data: encodeFunctionData({
            abi: USDC_ABI,
            functionName: "transfer",
            args: [recipient, BigInt(Math.floor(amount * 1e6))],
          }),
        },
      });
      
      uoHash = result.hash;
      
      // console.log('Client:', client);
      console.log('UserOperation Hash:', uoHash);      
      // Add manual checking as fallback
      let tx: Hex | undefined;
      const startTime = Date.now();
      while (!tx && Date.now() - startTime < 180_000) { // 3 minute timeout
        try {
          tx = await client.waitForUserOperationTransaction({ hash: uoHash });
        } catch (e) {
          if (!(e instanceof Error) || !e.message.includes("not found")) throw e;
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      if (!tx) {
        throw new Error(`
          Transaction not found after 3 minutes. Check bundler status:
          - OP Hash: ${uoHash}
          - Bundler: ${client.chain.rpcUrls.alchemy.http[0]}
          - Explorer: ${client.chain.blockExplorers?.default.url}/tx/${uoHash}
        `);
      }

      setTxUrl(`${client.chain.blockExplorers!.default.url}/tx/${tx}`);
    } catch (e: any) {
      setError(e.message.replace(/\[.*?\]/g, '')); // Clean up error message
      console.error('Full error details:', {
        error: e,
        uoHash,
        clientConfig: client?.chain,
        paymaster: client?.paymaster
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="mb-2">AI Agent Purchase</CardTitle>
              <CardDescription>
                The AI Agent will complete the purchase for you with a gasless
                USDC transaction.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border">
              <Bot className="h-6 w-6 text-foreground/80 mt-1" />
              <div className="flex-1">
                <Label htmlFor="instruction" className="text-foreground/80">
                  User Instruction
                </Label>
                <Input
                  id="instruction"
                  className="text-base border-0 shadow-none px-0 focus-visible:ring-0"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="e.g. I want to buy a watch..."
                />
              </div>
            </div>

            <div className="rounded-lg border bg-background p-4">
              <h3 className="font-semibold text-lg mb-2">Transaction Details</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Action:</span>{" "}
                  Send USDC
                </p>
                <p>
                  <span className="font-medium text-foreground">Amount:</span> {USDC_AMOUNT} USDC
                </p>
                <p className="break-all">
                  <span className="font-medium text-foreground">
                    Recipient:
                  </span>{" "}
                  {RECIPIENT_ADDRESS}
                </p>
              </div>
            </div>
          </div>

          {isSending && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-600 flex items-center gap-2">
                <Loader2 className="animate-spin h-4 w-4" />
                Transaction pending...
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 break-words">
                Error: {error}
                {txUrl && (
                  <>
                    <br />
                    <Link
                      href={txUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      View failed transaction
                    </Link>
                  </>
                )}
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center">
            <Button
              className="w-full sm:w-auto gap-2 relative overflow-hidden group"
              size="lg"
              onClick={handleSend}
              disabled={isSending}
            >
              <span
                className={cn(
                  "flex items-center gap-2 transition-transform duration-300",
                  isSending ? "translate-y-10" : ""
                )}
              >
                Execute Payment
              </span>
              <span
                className={cn(
                  "absolute inset-0 flex items-center justify-center transition-transform duration-300",
                  isSending ? "translate-y-0" : "translate-y-10"
                )}
              >
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Sending...
              </span>
            </Button>

            <div className="flex-1"></div>

            {txUrl && (
              <Button
                variant="outline"
                size="lg"
                className={cn(
                  "gap-2 w-full sm:w-auto relative overflow-hidden transition-all duration-500",
                  "border-green-400 text-green-700 hover:bg-green-50"
                )}
              >
                <Link
                  href={txUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Transaction Successful</span>
                    <ExternalLink className="h-4 w-4" />
                  </div>
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
}