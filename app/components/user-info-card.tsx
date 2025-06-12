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
  installValidationActions,
  SingleSignerValidationModule,
  getDefaultSingleSignerValidationModuleAddress,
  semiModularAccountBytecodeAbi,
  HookType,
  TimeRangeModule,
  getDefaultTimeRangeModuleAddress,
} from "@account-kit/smart-contracts/experimental";
import { type ModularAccountV2 } from "@account-kit/smart-contracts";
import { baseSepolia, type AlchemySmartAccountClient } from "@account-kit/infra";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { getAbiItem, toFunctionSelector, type Address, type Hex, type Chain } from "viem";
import { Spinner } from "./spinner";
import { type AlchemySigner } from "@account-kit/core";


export default function UserInfo() {
  const [isCopied, setIsCopied] = useState(false);
  const user = useUser();
  const userEmail = user?.email ?? "anon";
  const { client } = useSmartAccountClient({});
  const signer = useSigner();

  // New state variables for session key
  const [isPermitting, setIsPermitting] = useState(false);
  const [aiAgentAddress, setAiAgentAddress] = useState<Address | null>(null);
  const [userOpHash, setUserOpHash] = useState<Hex | null>(null);
  const [ownerEoaAddress, setOwnerEoaAddress] = useState<Address | null>(null);

  // Generate the AI agent account once and store it in state.
  // This ensures that we use the same agent address for all permit actions.
  const [agentAccount] = useState<PrivateKeyAccount>(() =>
    privateKeyToAccount(generatePrivateKey())
  );

  useEffect(() => {
    const fetchOwnerAddress = async () => {
      if (signer) {
        setOwnerEoaAddress(await signer.getAddress());
      }
    };
    fetchOwnerAddress();
  }, [signer]);

  const handleCopy = () => {
    navigator.clipboard.writeText(client?.account?.address ?? "");
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // New function for permitting AI agent
  const onPermit = async () => {
    setIsPermitting(true);
    setUserOpHash(null);

    const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    if (!apiKey) {
      throw new Error("NEXT_PUBLIC_ALCHEMY_API_KEY is not set");
    }

    if (!client || !client.account || !signer || !client.chain) {
      console.error("Smart account client, account, signer, or chain not available.");
      setIsPermitting(false);
      return;
    }

    try {
      const modularClient = (client as AlchemySmartAccountClient<Chain, ModularAccountV2<AlchemySigner>>).extend(installValidationActions);
      const agentSignerAddress = agentAccount.address;
      setAiAgentAddress(agentSignerAddress);

      const sessionKeyEntityId = 1;
      const hookEntityId = 2;
      const now = Math.floor(Date.now() / 1000);
      const oneHour = 60 * 60;
      const timeRangeInstallData = TimeRangeModule.encodeOnInstallData({
        entityId: hookEntityId,
        validAfter: now,
        validUntil: now + oneHour,
      });

      const result = await modularClient.installValidation({
        validationConfig: {
          moduleAddress: getDefaultSingleSignerValidationModuleAddress(
            modularClient.chain
          ),
          entityId: sessionKeyEntityId,
          isGlobal: false,
          isSignatureValidation: false,
          isUserOpValidation: true,
        },
        selectors: [
          toFunctionSelector(getAbiItem({ abi: semiModularAccountBytecodeAbi, name: "execute" })),
          toFunctionSelector(getAbiItem({ abi: semiModularAccountBytecodeAbi, name: "executeBatch" })),
        ],
        installData: SingleSignerValidationModule.encodeOnInstallData({
          entityId: sessionKeyEntityId,
          signer: agentSignerAddress,
        }),
        hooks: [
          {
            hookConfig: {
              address: getDefaultTimeRangeModuleAddress(modularClient.chain),
              entityId: hookEntityId,
              hookType: HookType.VALIDATION,
              hasPreHooks: true,
              hasPostHooks: false,
            },
            initData: timeRangeInstallData,
          },
        ],
      });

      setUserOpHash(result.hash);

      await modularClient.waitForUserOperationTransaction(result);
    } catch (e) {
      console.error("Failed to permit agent:", e);
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
              {formatAddress(client?.account?.address ?? "")}
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
                const address = client?.account?.address;
                if (address && client?.chain?.blockExplorers?.default?.url) {
                  window.open(
                    `${client.chain.blockExplorers.default.url}/address/${address}`,
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
          <Button onClick={onPermit} disabled={isPermitting || !client?.account?.address}>
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
