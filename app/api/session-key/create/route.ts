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
  privateKey: string;
  sessionEntityId: number;
  hookEntityId: number;
};

// Session key creation with permissions
export async function POST(_request: Request) {
  try {
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
    let sessionKeys: Record<string, SessionKeyData> = {};
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      sessionKeys = JSON.parse(data) as Record<string, SessionKeyData>;
    } catch (error) {
      // File doesn't exist, start with empty object
    }

    sessionKeys[agentAccount.address] = {
      id: uuidv4(),
      privateKey: agentPrivateKey,
      sessionEntityId: sessionKeyEntityId,
      hookEntityId: hookEntityId,
    };

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
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Session key creation failed", details: error },
      { status: 500 }
    );
  }
}

// Session key revocation
// export async function DELETE(request: Request) {
//   const { sessionKeyEntityId, hookEntityId, agentAccount, accountAddress } = await request.json();

//   const client = createAlchemySmartAccountClient({
//     chain: baseSepolia,
//     transport: alchemy({ apiKey: process.env.ALCHEMY_API_KEY || "" }),
//     account: accountAddress,
//   });

//   const modularClient = (client as unknown as AlchemySmartAccountClient<Chain, ModularAccountV2<SmartAccountSigner>>).extend(installValidationActions);

//   try {
//     const result = await modularClient.uninstallValidation({
//       moduleAddress: getDefaultSingleSignerValidationModuleAddress(modularClient.chain),
//       entityId: sessionKeyEntityId,
//       uninstallData: SingleSignerValidationModule.encodeOnUninstallData({
//         entityId: sessionKeyEntityId,
//       }),
//       hookUninstallDatas: [
//         TimeRangeModule.encodeOnUninstallData({
//           entityId: hookEntityId
//         }),
//       ],
//     });

//     await modularClient.waitForUserOperationTransaction(result);

//     // Remove from session keys file
//     const filePath = path.join(process.cwd(), 'session-keys.json');
//     let sessionKeys: Record<string, SessionKeyData> = {};
    
//     try {
//       const data = await fs.readFile(filePath, 'utf-8');
//       sessionKeys = JSON.parse(data) as Record<string, SessionKeyData>;
//       delete sessionKeys[agentAccount.address];
//       await fs.writeFile(filePath, JSON.stringify(sessionKeys, null, 2));
//     } catch (error) {
//       // File doesn't exist or other error, log but continue
//       console.error('Error updating session keys file:', error);
//     }

//     return NextResponse.json({
//       success: true,
//       revokedKey: agentAccount.address,
//       txHash: result.hash
//     });
//   } catch (error) {
//     return NextResponse.json(
//       { error: "Session key revocation failed", details: error },
//       { status: 500 }
//     );
//   }
// } 