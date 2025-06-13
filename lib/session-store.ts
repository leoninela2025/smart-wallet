import fs from "fs/promises";
import path from "path";
import { type Address } from "viem";

const SESSION_KEYS_FILE = path.join(process.cwd(), "session-keys.json");

type SessionKeyStore = {
  [address: Address]: `0x${string}`;
};

async function readSessionKeys(): Promise<SessionKeyStore> {
  try {
    const data = await fs.readFile(SESSION_KEYS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return {}; // File not found, return empty store
    }
    throw error;
  }
}

async function writeSessionKeys(keys: SessionKeyStore): Promise<void> {
  await fs.writeFile(SESSION_KEYS_FILE, JSON.stringify(keys, null, 2));
}

export async function storeSessionKey(
  address: Address,
  privateKey: `0x${string}`
): Promise<void> {
  const keys = await readSessionKeys();
  keys[address] = privateKey;
  await writeSessionKeys(keys);
}

export async function getSessionKey(
  address: Address
): Promise<`0x${string}` | undefined> {
  const keys = await readSessionKeys();
  return keys[address];
} 