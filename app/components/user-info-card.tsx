"use client"

import { useState, useEffect, useCallback } from "react"
import { ExternalLink, Copy, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatAddress } from "@/lib/utils"
import { useUser, useSmartAccountClient, useSigner, useSignTypedData } from "@account-kit/react"
import { installValidationActions } from "@account-kit/smart-contracts/experimental"
import type { ModularAccountV2 } from "@account-kit/smart-contracts"
import { baseSepolia, type AlchemySmartAccountClient } from "@account-kit/infra"
import { type Address, type Hex, type Chain, erc20Abi, formatUnits } from "viem"
import { Spinner } from "./spinner"
import type { SmartAccountSigner } from "@aa-sdk/core"
import { USDC_CONTRACT_ADDRESS } from "@/lib/constants"
import WalletCardModal from "./WalletCardModal"
import {randomBytes} from "crypto";



const USDC_DECIMALS = 6

export default function UserInfo() {
  const [isCopied, setIsCopied] = useState(false)
  const user = useUser()
  const userEmail = user?.email ?? "anon"
  const { client, address } = useSmartAccountClient({})

  const validAfterTimestamp = BigInt(Math.floor(Date.now() / 1000) - 60);
  const deadlineTimestamp = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour deadline

  // The nonce for `transferWithAuthorization` must be a unique `bytes32` value to prevent replay attacks.
  // We generate a random one here. This is different from the sequential `uint256` nonce used by the `permit` function.
  const nonceForSigning = `0x${randomBytes(32).toString("hex")}` as Hex;

  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"


  const messageToSign = {
            from: "0x6921b130d297cc43754afba22e5eac0fbf8db75b" as `0x${string}`,
            to: "0xd7FeB809e8B9C52CE3C0B792506D2FE474aAE06D" as `0x${string}`, // The recipient of the funds
            value: BigInt(10000),
            validAfter: validAfterTimestamp,
            validBefore: deadlineTimestamp,
            nonce: nonceForSigning
        };

  const domain = {
              name: "USDC",
              version: "2", // Ensure this version matches what the USDC contract expects for this type of signature
              chainId: BigInt(84532),
              verifyingContract: usdcAddress
          } as const

const transferAuthorisationTypes = {
            TransferWithAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" } // Facilitator expects bytes32 nonce in the message
            ]
        } as const;

  const typedData = {
      domain: domain,
      types: transferAuthorisationTypes,
      primaryType: "TransferWithAuthorization",
      message: messageToSign
      
  }
  const {
    signTypedData,
    signTypedDataAsync,
    signedTypedData,
    isSigningTypedData,
    error,
  } = useSignTypedData({
    client,
    // these are optional
    onSuccess: (result) => {
      // do something on success
      console.log("Signed Typed Data:", result)
      console.log("Signed Typed Data Async:", typedData)
    },
    onError: (error) => console.error(error),
  });

  

  const signer = useSigner()

  const [balance, setBalance] = useState<string | null>(null)
  const [isPermitting, setIsPermitting] = useState(false)
  const [isFunding, setIsFunding] = useState(false)
  const [fundingTxHash, setFundingTxHash] = useState<Hex | null>(null)
  const [aiAgentAddress, setAiAgentAddress] = useState<Address | null>(null)
  const [userOpHash, setUserOpHash] = useState<Hex | null>(null)
  const [ownerEoaAddress, setOwnerEoaAddress] = useState<Address | null>(null)

  const fetchBalance = useCallback(async () => {
    console.log(client)
    try {

      const result = await signTypedData({ typedData });
      console.log(result)
    } catch (error) {
      console.error("Error signing typed data:", error);
    }

    if (!client || !address) {
      return
    }
    try {
      const balance = await client.readContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      })
      setBalance(formatUnits(balance, USDC_DECIMALS))
    } catch (e) {

      console.error("Error fetching balance: ", e)
      setBalance(null)
    }
  }, [client, address])

  useEffect(() => {

    const fetchOwnerAddress = async () => {
      if (signer) {
        setOwnerEoaAddress(await signer.getAddress())
      }
    }
    fetchOwnerAddress()
  }, [signer])

  useEffect(() => {
    if (address && client) {
      fetchBalance()
    }
  }, [address, client, fetchBalance])

  useEffect(() => {
    const checkExistingSession = async () => {
      const sessionId = localStorage.getItem("currentSessionId")
      const expiration = localStorage.getItem("currentSessionExpiration")

      console.log("Session check started", { sessionId, expiration })

      if (sessionId && expiration) {
        try {
          console.log("Attempting to fetch session", sessionId)
          const response = await fetch(`/api/sessions/${sessionId}`)
          console.log("Session check response status:", response.status)

          const data = await response.json()
          console.log("Session check response data:", data)

          if (response.ok) {
            setAiAgentAddress(data.sessionKeyAddress)
          } else {
            console.warn("Session validation failed, clearing storage")
            localStorage.removeItem("currentSessionId")
            localStorage.removeItem("currentSessionExpiration")
          }
        } catch (error) {
          console.error("Session check failed:", error)
          localStorage.removeItem("currentSessionId")
          localStorage.removeItem("currentSessionExpiration")
        }
      }
    }

    checkExistingSession()
  }, [signer])

  const handleCopy = () => {
    navigator.clipboard.writeText(address ?? "")
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const onPermit = async () => {
    setIsPermitting(true)
    setUserOpHash(null)

    if (!client || !address || !signer) {
      throw new Error("Smart account client not ready")
    }

    try {
      // Call API endpoint to get session key creation payload
      const response = await fetch("/api/sessions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          smartWalletAddress: address,
        }),
      })

      if (!response.ok) throw new Error("Failed to create session key")

      const data = await response.json()
      // Use API response to install validation
      try {
        const modularClient = (
          client as unknown as AlchemySmartAccountClient<Chain, ModularAccountV2<SmartAccountSigner>>
        ).extend(installValidationActions)
        const result = await modularClient.installValidation({...data.installParams})
        await modularClient.waitForUserOperationTransaction(result)
        setUserOpHash(result.hash)
        setAiAgentAddress(data.sessionKeyAddress)
        localStorage.setItem("currentSessionId", data.currentSessionId)
        localStorage.setItem("currentSessionExpiration", data.expiration.toString())
        await fetchBalance()
      } catch (e) {
        // Clean up session key record if validation failed
        if (data.installParams?.id) {
          try {
            await fetch(`/api/sessions/delete/${data.installParams.id}`, {
              method: "DELETE",
            })
          } catch (deleteError) {
            console.error("Failed to delete session key record:", deleteError)
          }
        }
        console.error("Agent permission error:", e)
      }
    } catch (e) {
      console.error("Agent permission error:", e)
    } finally {
      setIsPermitting(false)
    }
  }

  const onFundWallet = async () => {
    if (!address) return

    setIsFunding(true)
    setFundingTxHash(null)
    try {
      const response = await fetch("/api/fund-wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipient: address }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fund wallet")
      }

      const data = await response.json()
      setFundingTxHash(data.txHash)

      if (client && data.txHash) {
        await client.waitForTransactionReceipt({ hash: data.txHash })
      }

      await fetchBalance()
    } catch (error) {
      console.error("Funding error:", error)
      alert((error as Error).message)
    } finally {
      setIsFunding(false)
    }
  }

  const getExplorerLink = (address: Address) => `${baseSepolia.blockExplorers?.default.url}/address/${address}`

  const getUserOpLink = (hash: Hex) => `https://jiffyscan.xyz/userOpHash/${hash}?network=${baseSepolia.id}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transferring funds to on chain wallet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {address && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>
                Fund Your <a href={`${baseSepolia.blockExplorers.default.url}/address/${address}`} className="hover:underline">Wallet</a>
              </CardTitle>
              
              <CardDescription>Fund your smart wallet with some USDC using payment methods on file.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                 
                  <WalletCardModal 
                    onFundWallet={onFundWallet} onRefreshBalances={fetchBalance} creditLimit={10000} onChainBalance={Number(balance)}
                  />
                </div>
              </div>
            </CardContent>

          </Card>
        )}

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
  )
}