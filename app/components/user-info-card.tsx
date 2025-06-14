import { useState, useEffect } from "react";
import { ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatAddress } from "@/lib/utils";
import { useUser, useSmartAccountClient, useSigner } from "@account-kit/react";
import { installValidationActions} from "@account-kit/smart-contracts/experimental";
import { type ModularAccountV2 } from "@account-kit/smart-contracts";
import { baseSepolia, type AlchemySmartAccountClient } from "@account-kit/infra";
import { type Address, type Hex, type Chain } from "viem";
import { Spinner } from "./spinner";
import { SmartAccountSigner } from "@aa-sdk/core";

export default function UserInfo() {
  const [isCopied, setIsCopied] = useState(false);
  const user = useUser();
  const userEmail = user?.email ?? "anon";
  const { client, address } = useSmartAccountClient({});
  const signer = useSigner();

  const [isPermitting, setIsPermitting] = useState(false);
  const [aiAgentAddress, setAiAgentAddress] = useState<Address | null>(null);
  const [userOpHash, setUserOpHash] = useState<Hex | null>(null);
  const [ownerEoaAddress, setOwnerEoaAddress] = useState<Address | null>(null);

  useEffect(() => {
    const fetchOwnerAddress = async () => {
      if (signer) {
        setOwnerEoaAddress(await signer.getAddress());
      }
    };
    fetchOwnerAddress();
  }, [signer]);

  useEffect(() => {
    const checkExistingSession = async () => {
      const sessionId = localStorage.getItem('currentSessionId');
      const expiration = localStorage.getItem('currentSessionExpiration');

      console.log('Session check started', { sessionId, expiration });

      if (sessionId && expiration) {
        try {
          console.log('Attempting to fetch session', sessionId);
          const response = await fetch(`/api/sessions/${sessionId}`);
          console.log('Session check response status:', response.status);
          
          const data = await response.json();
          console.log('Session check response data:', data);

          if (response.ok) {
            setAiAgentAddress(data.sessionKeyAddress);
          } else {
            console.warn('Session validation failed, clearing storage');
            localStorage.removeItem('currentSessionId');
            localStorage.removeItem('currentSessionExpiration');
          }
        } catch (error) {
          console.error('Session check failed:', error);
          localStorage.removeItem('currentSessionId');
          localStorage.removeItem('currentSessionExpiration');
        }
      }
    };
    
    checkExistingSession();
  }, [signer]);

  const handleCopy = () => {
    navigator.clipboard.writeText(address ?? "");
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const onPermit = async () => {
    setIsPermitting(true);
    setUserOpHash(null);

    if (!client || !address || !signer) {
      throw new Error("Smart account client not ready");
    }

    try {
      // Call API endpoint to get session key creation payload
      const response = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) throw new Error('Failed to create session key');
      
      const data = await response.json();
      // Use API response to install validation
      try {
        const modularClient = (client as unknown as AlchemySmartAccountClient<Chain, ModularAccountV2<SmartAccountSigner>>).extend(installValidationActions);
        const result = await modularClient.installValidation(data.installParams);
        await modularClient.waitForUserOperationTransaction(result);
        setUserOpHash(result.hash);
        setAiAgentAddress(data.sessionKeyAddress);
        localStorage.setItem('currentSessionId', data.currentSessionId);
        localStorage.setItem('currentSessionExpiration', data.expiration.toString());
      } catch (e) {
        // Clean up session key record if validation failed
        if (data.installParams?.id) {
          try {
            await fetch(`/api/sessions/delete/${data.installParams.id}`, {
              method: 'DELETE',
            });
          } catch (deleteError) {
            console.error("Failed to delete session key record:", deleteError);
          }
        }
        console.error("Agent permission error:", e);
      }
    } catch (e) {
      console.error("Agent permission error:", e);
    } finally {
      setIsPermitting(false);
    }
  };

  const getExplorerLink = (address: Address) =>
    `${baseSepolia.blockExplorers?.default.url}/address/${address}`;

  const getUserOpLink = (hash: Hex) =>
    `https://jiffyscan.xyz/userOpHash/${hash}?network=${baseSepolia.id}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>
          Your users are always in control of their non-custodial smart wallet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            Email
          </p>
          <p className="font-medium">{userEmail}</p>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-muted-foreground">
              Smart wallet address
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs py-1 px-2">
              {formatAddress(address ?? "")}
            </Badge>
            <TooltipProvider>
              <Tooltip open={isCopied}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleCopy}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copied!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                if (address && baseSepolia.blockExplorers?.default?.url) {
                  window.open(
                    `${baseSepolia.blockExplorers.default.url}/address/${address}`,
                    "_blank"
                  );
                }
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Create Session Key Section */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Create an AI Session</CardTitle>
            <CardDescription>
              Authorize an AI agent with a one-hour session key for your existing smart account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiAgentAddress && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  AI Agent Address
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs py-1 px-2">
                    {formatAddress(aiAgentAddress)}
                  </Badge>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => navigator.clipboard.writeText(aiAgentAddress)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy Address</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => window.open(getExplorerLink(aiAgentAddress), "_blank")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
            {userOpHash && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  UserOp Hash
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs py-1 px-2">
                    {formatAddress(userOpHash)}
                  </Badge>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => navigator.clipboard.writeText(userOpHash)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy Hash</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => window.open(getUserOpLink(userOpHash), "_blank")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {!isPermitting && (
                  <p className="mt-1 text-green-600">Success! Session key registered.</p>
                )}
                {isPermitting && (
                  <p className="mt-1">Waiting for the transaction to be mined...</p>
                )}
              </div>
            )}
            <Button onClick={onPermit} disabled={isPermitting || !address}>
              {isPermitting ? (
                <div className="flex items-center gap-2">
                  <Spinner /> Creating Session Key...
                </div>
              ) : (
                "Create New Session"
              )}
            </Button>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
