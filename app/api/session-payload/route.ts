import { NextResponse } from "next/server";
import { 
  SingleSignerValidationModule,
  getDefaultSingleSignerValidationModuleAddress,
  semiModularAccountBytecodeAbi,
  HookType,
  TimeRangeModule,
  getDefaultTimeRangeModuleAddress,
} from "@account-kit/smart-contracts/experimental";
import { getAbiItem, toFunctionSelector, decodeErrorResult } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "@account-kit/infra";
import { storeSessionKey } from "@/lib/session-store";
import { type Address } from "viem";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Generate agent key pair
    const agentPrivateKey = generatePrivateKey();
    const agentAccount = privateKeyToAccount(agentPrivateKey);
    
    // Store securely on server side
    await storeSessionKey(agentAccount.address, agentPrivateKey);
    
    // Configuration (should use environment variables in production)
    const sessionKeyEntityId = Math.floor(Math.random() * 4294967295);
    const hookEntityId = sessionKeyEntityId;
    const sessionDurationSeconds = 60 * 60; // 1 hour
    
    // Current timestamp and validity window
    const now = Math.floor(Date.now() / 1000) - 300; // 5 minute buffer
    const validUntil = now + sessionDurationSeconds + 300;

    // Prepare validation module data
    const validationModuleAddress = getDefaultSingleSignerValidationModuleAddress(baseSepolia);
    const installData = SingleSignerValidationModule.encodeOnInstallData({
      entityId: sessionKeyEntityId,
      signer: agentAccount.address,
    });

    // Prepare time range hook data
    const timeRangeModuleAddress = getDefaultTimeRangeModuleAddress(baseSepolia);
    const timeRangeInstallData = TimeRangeModule.encodeOnInstallData({
      entityId: hookEntityId,
      validAfter: now,
      validUntil,
    });

    // Add temporary logging
    console.log('Validation Module Address:', 
      getDefaultSingleSignerValidationModuleAddress(baseSepolia))
    console.log('TimeRange Module Address:', 
      getDefaultTimeRangeModuleAddress(baseSepolia))

    return NextResponse.json({
      agentAddress: agentAccount.address,
      validationConfig: {
        moduleAddress: validationModuleAddress,
        entityId: sessionKeyEntityId,
        isGlobal: false,
        isSignatureValidation: false,
        isUserOpValidation: true,
      },
      selectors: [
        toFunctionSelector(getAbiItem({ abi: semiModularAccountBytecodeAbi, name: "execute" })),
        toFunctionSelector(getAbiItem({ abi: semiModularAccountBytecodeAbi, name: "executeBatch" })),
      ],
      installData,
      hooks: [
        {
          hookConfig: {
            address: timeRangeModuleAddress,
            entityId: hookEntityId,
            hookType: HookType.VALIDATION,
            hasPreHooks: true,
            hasPostHooks: false,
          },
          initData: timeRangeInstallData,
        },
      ]
    });
  } catch (error: any) {
    console.error("Session payload error:", error);
    if (error.data?.revertData) {
      const errorResult = decodeErrorResult({
        abi: semiModularAccountBytecodeAbi,
        data: error.data.revertData,
      });
      console.error('Decoded error:', errorResult);
    }
    return NextResponse.json(
      { error: "Failed to generate session payload" },
      { status: 500 }
    );
  }
} 