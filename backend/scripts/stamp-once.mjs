import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import stacks from "@stacks/transactions";
import { STACKS_MAINNET } from "@stacks/network";
import {
  deriveStxPrivateKey,
  generateWallet,
  getRootNode,
} from "@stacks/wallet-sdk";

const {
  AnchorMode,
  PostConditionMode,
  broadcastTransaction,
  Cl,
  getAddressFromPrivateKey,
  makeContractCall,
} = stacks;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const contentPath = path.resolve(
  rootDir,
  "receipt",
  process.env.RECEIPT_CONTENT_FILE ?? "content.json"
);

const contractAddress =
  process.env.RECEIPT_CONTRACT_ADDRESS ??
  "SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH";
const contractName =
  process.env.RECEIPT_CONTRACT_NAME ?? "receipt-of-life-v2";

const privateKey = process.env.STACKS_PRIVATE_KEY;
const feeOverride = process.env.STAMP_FEE_MICROSTX
  ? Number(process.env.STAMP_FEE_MICROSTX)
  : null;
const maxRetries = Number(process.env.STAMP_MAX_RETRIES ?? 3);
const keyFileInput = process.env.RECEIPT_KEYS_FILE ?? ".key.local";
const keyFilePath = path.isAbsolute(keyFileInput)
  ? keyFileInput
  : path.resolve(rootDir, "receipt", keyFileInput);

const readJson = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const delaySeconds = async (seconds) => {
  if (!seconds || seconds <= 0) return;
  const { setTimeout: delay } = await import("node:timers/promises");
  await delay(seconds * 1000);
};

const deriveKeyFromMnemonic = async (mnemonic, index = 0) => {
  const password = process.env.STACKS_WALLET_PASSWORD ?? "receipt-batch";
  const wallet = await generateWallet({ secretKey: mnemonic, password });
  const rootNode = getRootNode(wallet);
  return deriveStxPrivateKey({ rootNode, index });
};

const parseKeyLine = (line) => {
  const words = line.split(/\s+/).filter(Boolean);
  return { raw: line, isMnemonic: words.length >= 12, mnemonic: words.join(" ") };
};

const loadKeys = async () => {
  if (privateKey) {
    return [{ raw: privateKey, isMnemonic: false, mnemonic: "" }];
  }
  const raw = await fs.readFile(keyFilePath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  if (lines.length === 0) {
    throw new Error(
      "No keys found. Set STACKS_PRIVATE_KEY or add keys to backend/receipt/.key.local."
    );
  }
  return lines.map(parseKeyLine);
};

const pickRandom = (items) => {
  if (!items || items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
};

const normalizeContentItems = (payload) => {
  const items = Array.isArray(payload) ? payload : payload?.items;
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item.text === "string") return item.text;
      return null;
    })
    .filter(Boolean);
};

const buildRecipientPool = async (keyLines) => {
  const pool = [];
  for (const entry of keyLines) {
    if (entry.isMnemonic) {
      for (let index = 0; index <= 47; index += 1) {
        const key = await deriveKeyFromMnemonic(entry.mnemonic, index);
        pool.push(getAddressFromPrivateKey(key, STACKS_MAINNET));
      }
    }
  }
  return pool;
};

const buildSenderPool = async (keyLines) => {
  const pool = [];
  for (const entry of keyLines) {
    if (entry.isMnemonic) {
      for (let index = 0; index <= 2; index += 1) {
        pool.push(await deriveKeyFromMnemonic(entry.mnemonic, index));
      }
    } else {
      pool.push(entry.raw);
    }
  }
  return pool;
};

const buildContractCall = async ({ functionName, functionArgs, senderKey }) => {
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      return await makeContractCall({
        contractAddress,
        contractName,
        functionName,
        functionArgs,
        senderKey,
        network: STACKS_MAINNET,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        ...(feeOverride ? { fee: BigInt(feeOverride) } : {}),
      });
    } catch (error) {
      const message = String(error?.message ?? error);
      const isRateLimited =
        message.includes("429") || message.includes("Too Many Requests");
      if (!isRateLimited || attempt === maxRetries - 1) {
        throw error;
      }
      await delaySeconds(5);
    }
  }
  throw new Error("Failed to build contract-call transaction.");
};

const main = async () => {
  const delaySecondsValue = Number(process.env.STAMP_DELAY_SECONDS ?? 0);
  if (delaySecondsValue > 0) {
    console.log(`Waiting ${delaySecondsValue}s before stamping...`);
    await delaySeconds(delaySecondsValue);
  }

  const contentJson = await readJson(contentPath);
  const contents = normalizeContentItems(contentJson);

  if (contents.length === 0) {
    throw new Error("No receipt content found in content.json");
  }

  const text = pickRandom(contents);
  if (!text || text.trim().length === 0) {
    throw new Error("Receipt text is empty.");
  }

  if (text.length > 160) {
    throw new Error("Receipt text exceeds 160 characters.");
  }

  const keyLines = await loadKeys();
  const senderPool = await buildSenderPool(keyLines);
  const senderKey = pickRandom(senderPool);
  const recipientPool = await buildRecipientPool(keyLines);
  const recipient = pickRandom(recipientPool);

  const senderAddress = getAddressFromPrivateKey(senderKey, STACKS_MAINNET);
  const shouldGift =
    Math.random() < 0.5 && recipient && recipient !== senderAddress;
  const functionName = shouldGift ? "submit-receipt-for" : "submit-receipt";
  const args = shouldGift
    ? [Cl.stringUtf8(text), Cl.principal(recipient)]
    : [Cl.stringUtf8(text)];

  const transaction = await buildContractCall({
    functionName,
    functionArgs: args,
    senderKey,
  });
  if (!transaction) {
    throw new Error("Failed to build contract-call transaction.");
  }

  const response = await broadcastTransaction({
    transaction,
    network: STACKS_MAINNET,
  });

  if (response.error) {
    throw new Error(
      `Broadcast failed: ${response.error} (${response.reason ?? "unknown"})`
    );
  }

  console.log("Stamped receipt", {
    functionName,
    senderAddress,
    txid: response.txid,
  });
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
