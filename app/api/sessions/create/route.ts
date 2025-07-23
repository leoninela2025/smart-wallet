import { NextResponse } from "next/server";
import {
  getDefaultSingleSignerValidationModuleAddress,
  SingleSignerValidationModule,
  semiModularAccountBytecodeAbi,
  TimeRangeModule,
  getDefaultTimeRangeModuleAddress,
  HookType,
} from "@account-kit/smart-contracts/experimental";
import { baseSepolia } from "@account-kit/infra";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { toFunctionSelector, getAbiItem } from "viem";
import * as fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Add type definition at the top
type SessionKeyData = {
  id: string;
  address: string;
  privateKey: string;
  sessionEntityId: number;
  hookEntityId: number;
  smartWalletAddress: string;
  expiration: number;
};

// Session key creation with permissions
export async function POST(_request: Request) {
  try {
    const { smartWalletAddress } = await _request.json();

    const agentPrivateKey = generatePrivateKey();
    const agentAccount = privateKeyToAccount(agentPrivateKey);
    
    // Configuration (should use environment variables in production)
    const sessionKeyEntityId = Math.floor(Math.random() * 4294967295);
    const hookEntityId = 1;
    const sessionDurationSeconds = 60 * 60; // 1 hour
    
    // Current timestamp and validity window
    const now = Math.floor(Date.now() / 1000) - 300; // 5 minute buffer
    const validUntil = now + sessionDurationSeconds + 300;

    const timeRangeModuleAddress = getDefaultTimeRangeModuleAddress(baseSepolia);
      const timeRangeInstallData = TimeRangeModule.encodeOnInstallData({
        entityId: hookEntityId,
        validAfter: now,
        validUntil,
      });

    // Persist session key metadata
    const filePath = path.join(process.cwd(), 'session-keys.json');
    let sessionKeys: SessionKeyData[] = []; // Changed from object to array
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      sessionKeys = JSON.parse(data) as SessionKeyData[];
    } catch (error) {
      // File doesn't exist, start with empty array
    }

    // Add new entry to array instead of object key
    const sessionId = uuidv4();
    sessionKeys.push({
      id: sessionId,
      address: agentAccount.address,
      privateKey: agentPrivateKey,
      sessionEntityId: sessionKeyEntityId,
      hookEntityId: hookEntityId,
      smartWalletAddress: smartWalletAddress,
      expiration: validUntil,
    });

    await fs.writeFile(filePath, JSON.stringify(sessionKeys, null, 2));

    const installParams = {
        validationConfig: {
          moduleAddress: getDefaultSingleSignerValidationModuleAddress(baseSepolia),
          entityId: sessionKeyEntityId,
          isGlobal: true,
          isSignatureValidation: true,
          isUserOpValidation: true,
        },
        selectors: [
          toFunctionSelector(getAbiItem({ abi: semiModularAccountBytecodeAbi, name: "execute" })),
          toFunctionSelector(getAbiItem({ abi: semiModularAccountBytecodeAbi, name: "executeBatch" })),
        ],
        installData: SingleSignerValidationModule.encodeOnInstallData({
          entityId: sessionKeyEntityId,
          signer: agentAccount.address, // Address of the session key
        }),
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
        ],
      }

    return NextResponse.json(
      {
        sessionKeyAddress: agentAccount.address,
        installParams: installParams,
        currentSessionId: sessionId,
        expiration: validUntil,
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Session key creation failed", details: error },
      { status: 500 }
    );
  }
}