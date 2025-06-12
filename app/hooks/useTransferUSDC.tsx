import { useCallback, useMemo, useState } from "react";
import {
  useSmartAccountClient,
  useSendUserOperation,
} from "@account-kit/react";
import { encodeFunctionData, type Address } from "viem";
import { USDC_ABI, USDC_CONTRACT_ADDRESS } from "@/lib/constants";

export interface UseTransferUSDCParams {
  to: Address;
  amount: bigint;
  onSuccess?: () => void;
}
export interface UseTransferUSDCReturn {
  isSending: boolean;
  handleSend: () => void;
  transactionUrl?: string;
  error?: string;
}

export const useTransferUSDC = ({
  to,
  amount,
  onSuccess,
}: UseTransferUSDCParams): UseTransferUSDCReturn => {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string>();

  const { client } = useSmartAccountClient({});

  const handleSuccess = () => {
    setIsSending(false);
    setError(undefined);
    onSuccess?.();
  };

  const handleError = (error: Error) => {
    console.error("Transfer error:", error);
    setIsSending(false);
    setError(error.message || "Failed to send USDC");
  };

  const { sendUserOperationResult, sendUserOperation } = useSendUserOperation({
    client,
    waitForTxn: true,
    onError: handleError,
    onSuccess: handleSuccess,
    onMutate: () => {
      setIsSending(true);
      setError(undefined);
    },
  });

  const handleSend = useCallback(async () => {
    if (!client) {
      setError("Wallet not connected");
      return;
    }

    sendUserOperation({
      uo: {
        target: USDC_CONTRACT_ADDRESS,
        data: encodeFunctionData({
          abi: USDC_ABI,
          functionName: "transfer",
          args: [to, amount],
        }),
      },
    });
  }, [client, sendUserOperation, to, amount]);

  const transactionUrl = useMemo(() => {
    if (!client?.chain?.blockExplorers || !sendUserOperationResult?.hash) {
      return undefined;
    }
    return `${client.chain.blockExplorers.default.url}/tx/${sendUserOperationResult.hash}`;
  }, [client, sendUserOperationResult?.hash]);

  return {
    isSending,
    handleSend,
    transactionUrl,
    error,
  };
}; 