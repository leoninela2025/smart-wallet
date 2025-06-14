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
import { 
  getDefaultSingleSignerValidationModuleAddress, 
  getDefaultTimeRangeModuleAddress, 
  installValidationActions, 
  TimeRangeModule, 
  HookType,
  semiModularAccountBytecodeAbi,
  SingleSignerValidationModule
} from "@account-kit/smart-contracts/experimental";
import { type ModularAccountV2 } from "@account-kit/smart-contracts";
import { baseSepolia, type AlchemySmartAccountClient } from "@account-kit/infra";
import { type Address, type Hex, type Chain, toFunctionSelector, getAbiItem } from "viem";
import { Spinner } from "./spinner";
import { SmartAccountSigner } from "@aa-sdk/core";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

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
      const response = await fetch('/api/session-key/create', {
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
      } catch (e) {
        // Clean up session key record if validation failed
        if (data.installParams?.id) {
          try {
            await fetch(`/api/session-key/delete/${data.installParams.id}`, {
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

        {/* New section for permitting AI Agent */}
        <div className="pt-4 border-t mt-4">
          <h3 className="text-lg font-semibold mb-2">Permit AI Agent</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Authorize an AI agent with a one-hour session key for your existing smart account.
          </p>
          {ownerEoaAddress && (
            <InfoRow
              label="Owner EOA Address"
              value={ownerEoaAddress}
              link={getExplorerLink(ownerEoaAddress)}
            />
          )}
          {aiAgentAddress && (
            <InfoRow
              label="AI Agent Address"
              value={aiAgentAddress}
              link={getExplorerLink(aiAgentAddress)}
            />
          )}
          {userOpHash && (
            <div>
              <InfoRow
                label="UserOp Hash"
                value={userOpHash}
                link={getUserOpLink(userOpHash)}
              />
              {!isPermitting && (
                <p className="mt-1 text-green-600">
                  Success! Session Key registered.
                </p>
              )}
              {isPermitting && (
                <p className="mt-1">Waiting for the transaction to be mined...</p>
              )}
            </div>
          )}
          <br />
          <Button onClick={onPermit} disabled={isPermitting || !address}>
            {isPermitting ? (
              <div className="flex items-center gap-2">
                <Spinner /> Submitting...
              </div>
            ) : (
              "Permit AI Agent"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// InfoRow component - moved from permit-agent-card.tsx
const InfoRow = ({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link: string;
}) => (
  <div className="text-sm">
    <p className="font-semibold">{label}:</p>
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="break-words text-blue-500 hover:underline"
    >
      {value}
    </a>
  </div>
);
