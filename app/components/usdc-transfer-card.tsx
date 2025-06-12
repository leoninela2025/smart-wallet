import { useState, useEffect } from "react";
import {
  ExternalLink,
  Loader2,
  CheckCircle,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useTransferUSDC } from "@/app/hooks/useTransferUSDC";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// This is a hardcoded address for demo purposes.
// In a real app, this would be dynamic.
const RECIPIENT_ADDRESS = "0x531d45E22D24bdACbB23C5004A1C64588B1E7f26";
const USDC_AMOUNT = 0.03;

export default function UsdcTransferCard() {
  const [showSuccess, setShowSuccess] = useState(true);
  const [instruction, setInstruction] = useState("I want to buy a watch, check the delivery and warranty before making a purchase");

  const { isSending, handleSend, error, transactionUrl } = useTransferUSDC({
    to: RECIPIENT_ADDRESS,
    amount: BigInt(USDC_AMOUNT * 10 ** 6), // USDC has 6 decimals
    onSuccess: () => {
      // any other success logic
    },
  });

  // Reset success animation when new transaction appears
  useEffect(() => {
    if (transactionUrl) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [transactionUrl]);

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

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 break-words overflow-hidden">
              Error: {error}
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

          {transactionUrl && (
            <Button
              variant="outline"
              size="lg"
              className={cn(
                "gap-2 w-full sm:w-auto relative overflow-hidden transition-all duration-500",
                "border-green-400 text-green-700 hover:bg-green-50",
                "animate-in fade-in duration-700"
              )}
            >
              <Link
                href={transactionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                {showSuccess ? (
                  <>
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 opacity-10"
                      style={{
                        animation: "sweep 1.5s ease-out",
                      }}
                    />
                    <span className="relative z-10">Success!</span>
                    <CheckCircle className="h-4 w-4 relative z-10" />
                    <style jsx>{`
                      @keyframes sweep {
                        0% {
                          transform: translateX(-100%);
                          opacity: 0;
                        }
                        50% {
                          opacity: 0.2;
                        }
                        100% {
                          transform: translateX(100%);
                          opacity: 0;
                        }
                      }
                    `}</style>
                  </>
                ) : (
                  <>
                    <span>View Transaction</span>
                    <ExternalLink className="h-4 w-4" />
                  </>
                )}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 