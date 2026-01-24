import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
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
const progressPath = path.resolve(
  rootDir,
  "receipt",
  process.env.RECEIPT_PROGRESS_FILE ?? ".progress.json"
);
const pidPath = path.resolve(
  rootDir,
  "receipt",
  process.env.RECEIPT_PID_FILE ?? ".stamp.pid"
);

const contractAddress =
  process.env.RECEIPT_CONTRACT_ADDRESS ??
  "SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH";
const contractName =
  process.env.RECEIPT_CONTRACT_NAME ?? "receipt-of-life-v2";

const keyFileInput = process.env.RECEIPT_KEYS_FILE ?? ".key.local";
const keyFilePath = path.isAbsolute(keyFileInput)
  ? keyFileInput
  : path.resolve(rootDir, "receipt", keyFileInput);
const privateKey = process.env.STACKS_PRIVATE_KEY;
const feeOverride = process.env.STAMP_FEE_MICROSTX
  ? Number(process.env.STAMP_FEE_MICROSTX)
  : null;

const intervalSeconds = Number(process.env.STAMP_INTERVAL_SECONDS ?? 47);
const maxRetries = Number(process.env.STAMP_MAX_RETRIES ?? 3);

const readJson = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const writeJson = async (file, payload) => {
  await fs.writeFile(file, JSON.stringify(payload, null, 2));
};

const deriveKeyFromMnemonic = async (mnemonic, index) => {
  const password = process.env.STACKS_WALLET_PASSWORD ?? "receipt-batch";
  const wallet = await generateWallet({ secretKey: mnemonic, password });
  const rootNode = getRootNode(wallet);
  return deriveStxPrivateKey({ rootNode, index });
};

const parseKeyLine = (line) => {
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length >= 12) {
    return { type: "mnemonic", value: words.join(" ") };
  }
  return { type: "privateKey", value: line };
};

const loadKeys = async () => {
  if (privateKey) return { mnemonics: [], keys: [privateKey] };
  const raw = await fs.readFile(keyFilePath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  if (lines.length === 0) {
    throw new Error(
      "No keys found. Set STACKS_PRIVATE_KEY or add mnemonics/private keys to backend/receipt/.key.local."
    );
  }
  const mnemonics = [];
  const keys = [];
  for (const line of lines) {
    const parsed = parseKeyLine(line);
    if (parsed.type === "mnemonic") {
      mnemonics.push(parsed.value);
    } else {
      keys.push(parsed.value);
    }
  }
  return { mnemonics, keys };
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

const buildSenderPool = async (mnemonics, fallbackKeys) => {
  const keys = [...fallbackKeys];
  for (const mnemonic of mnemonics) {
    for (let index = 0; index <= 3; index += 1) {
      keys.push(await deriveKeyFromMnemonic(mnemonic, index));
    }
  }
  return keys;
};

const buildRecipientPool = async (mnemonics) => {
  const recipients = [];
  for (const mnemonic of mnemonics) {
    for (let index = 0; index <= 47; index += 1) {
      const key = await deriveKeyFromMnemonic(mnemonic, index);
      recipients.push(getAddressFromPrivateKey(key, STACKS_MAINNET));
    }
  }
  return recipients;
};

const loadProgress = async () => {
  try {
    const raw = await fs.readFile(progressPath, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed?.index === "number") return parsed.index;
  } catch (err) {
    return 0;
  }
  return 0;
};

const saveProgress = async (index) => {
  await writeJson(progressPath, { index, updatedAt: new Date().toISOString() });
};

const buildContractCall = async ({
  functionName,
  functionArgs,
  senderKey,
}) => {
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
      await delay(5000);
    }
  }
  throw new Error("Failed to build contract-call transaction.");
};

const stampOnce = async ({ text, senderKeys, recipientPool }) => {
  if (!text || text.trim().length === 0) {
    throw new Error("Receipt text is empty.");
  }
  if (text.length > 160) {
    throw new Error("Receipt text exceeds 160 characters.");
  }

  const senderKey = senderKeys[Math.floor(Math.random() * senderKeys.length)];
  const senderAddress = getAddressFromPrivateKey(senderKey, STACKS_MAINNET);
  const recipient =
    recipientPool.length > 0
      ? recipientPool[Math.floor(Math.random() * recipientPool.length)]
      : null;
  const canGift = recipient && recipient !== senderAddress;
  const shouldGift = canGift && Math.random() < 0.5;
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

  return { txid: response.txid, functionName, senderAddress };
};

const main = async () => {
  await fs.writeFile(pidPath, String(process.pid));

  const contentJson = await readJson(contentPath);
  const contents = normalizeContentItems(contentJson);
  const { mnemonics, keys } = await loadKeys();
  const senderKeys = await buildSenderPool(mnemonics, keys);
  const recipientPool = await buildRecipientPool(mnemonics);

  if (contents.length === 0) {
    throw new Error("No receipt content found in content.json");
  }
  if (senderKeys.length === 0) {
    throw new Error("No sender keys available.");
  }

  let index = await loadProgress();
  if (index >= contents.length) {
    console.log("All receipts already stamped.");
    return;
  }

  while (index < contents.length) {
    const text = contents[index];
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const result = await stampOnce({ text, senderKeys, recipientPool });
        console.log("Stamped receipt", {
          index: index + 1,
          total: contents.length,
          ...result,
        });
        index += 1;
        await saveProgress(index);
        break;
      } catch (error) {
        attempt += 1;
        console.error(`Stamp failed (attempt ${attempt}/${maxRetries})`, error);
        if (attempt >= maxRetries) {
          throw error;
        }
        await delay(5000);
      }
    }

    if (index < contents.length) {
      console.log(`Waiting ${intervalSeconds}s before next stamp...`);
      await delay(intervalSeconds * 1000);
    }
  }

  console.log("All receipts stamped.");
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
