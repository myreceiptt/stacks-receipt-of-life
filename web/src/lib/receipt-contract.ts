"use client";

import {
  Cl,
  cvToJSON,
  type ClarityValue,
  fetchCallReadOnlyFunction,
} from "@stacks/transactions";
import { STACKS_TESTNET } from "@stacks/network";

async function loadStacksRequest() {
  // Server should never call wallet; throw early
  if (typeof window === "undefined") {
    throw new Error("Wallet request attempted on the server.");
  }
  const mod = await import("@stacks/connect");
  return mod.request;
}

const CONTRACT_NAME = "receipt-of-life";

type StacksTxResponse = {
  txid?: string;
};

export type Receipt = {
  id: number;
  owner: string;
  text: string;
  createdAt: number; // unix seconds from stacks-block-time
};

function getContractAddressOnly(): string {
  const addr = (process.env.NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS ?? "").trim();
  return addr;
}

function getContractId(): string {
  const addr = getContractAddressOnly();
  if (!addr) return "";
  // full "ST...address.receipt-of-life"
  return `${addr}.${CONTRACT_NAME}`;
}

/**
 * WRITE: submit a new Receipt of Life
 * (pakai stacks-connect secara dinamis)
 */
export async function submitReceipt(text: string): Promise<StacksTxResponse> {
  const contract = getContractId();

  if (!contract) {
    throw new Error(
      "Contract address is not configured yet. Set NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS in .env.local after deploying the contract to testnet."
    );
  }

  // Clarity value (Stacks Connect will convert to hex)
  const functionArgs = [Cl.stringUtf8(text)];

  const request = await loadStacksRequest();

  const response = (await request(
    { forceWalletSelect: false },
    "stx_callContract",
    {
      contract: contract as `${string}.${string}`,
      functionName: "submit-receipt",
      functionArgs,
      network: "testnet",
      // Allow STX movement without explicit post-conditions (MVP mode)
      postConditionMode: "allow",
    }
  )) as StacksTxResponse;

  return response;
}

/**
 * Helpers untuk JSON hasil cvToJSON
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractValueString(field: unknown): string | undefined {
  if (!isRecord(field)) return undefined;
  const v = field["value"];
  return typeof v === "string" ? v : undefined;
}

/**
 * READ-ONLY call via fetchCallReadOnlyFunction (Stacks.js v7)
 */
async function readOnlyCall(
  functionName: string,
  functionArgs: ClarityValue[] = [],
  senderAddress?: string
): Promise<unknown> {
  const contractAddress = getContractAddressOnly();
  if (!contractAddress) {
    throw new Error(
      "Contract address is not configured yet. Set NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS in .env.local."
    );
  }

  const cv = await fetchCallReadOnlyFunction({
    contractAddress,
    contractName: CONTRACT_NAME,
    functionName,
    functionArgs,
    senderAddress: senderAddress ?? contractAddress,
    network: STACKS_TESTNET, // pastikan benar-benar ke testnet
  });

  return cvToJSON(cv);
}

/**
 * READ: get the latest receipt id (u0 if none)
 * get-last-id = (ok (var-get last-id))
 */
export async function getLastId(): Promise<number> {
  const json = await readOnlyCall("get-last-id");

  if (!isRecord(json)) return 0;

  const candidates: unknown[] = [];

  // kandidat 1: json.value
  candidates.push(json["value"]);

  // kandidat 2: json.value.value (kalau nested response -> uint)
  const v1 = json["value"];
  if (isRecord(v1)) {
    candidates.push(v1["value"]);
  }

  // kandidat 3: kalau langsung { type: "uint", value: "N" }
  if (typeof json["value"] === "string") {
    candidates.push(json["value"]);
  }

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const parsed = Number(candidate);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

/**
 * Cari tuple yang berisi fields: owner, text, created-at
 * di mana pun posisinya di dalam JSON tree.
 */
function findReceiptTuple(node: unknown): Record<string, unknown> | null {
  if (!isRecord(node)) return null;

  // Kalau node ini wrapper tuple: { type: "tuple", value: { ... } }
  const typeField = node["type"];
  const valueField = node["value"];
  if (typeField === "tuple" && isRecord(valueField)) {
    const tuple = valueField;
    if ("owner" in tuple && "text" in tuple && "created-at" in tuple) {
      return tuple;
    }
  }

  // Kalau node ini sendiri sudah punya 3 field tersebut
  if ("owner" in node && "text" in node && "created-at" in node) {
    return node;
  }

  // Rekursif ke child nodes
  for (const key of Object.keys(node)) {
    const child = node[key];
    const found = findReceiptTuple(child);
    if (found) return found;
  }

  return null;
}

/**
 * READ: get a single receipt by id, or null
 * get-receipt = (map-get? receipts { id: id })
 * => optionalSome(tuple { owner, text, created-at }) | optionalNone
 */
export async function getReceipt(
  id: number,
  senderAddress?: string
): Promise<Receipt | null> {
  const raw = await readOnlyCall("get-receipt", [Cl.uint(id)], senderAddress);

  const tuple = findReceiptTuple(raw);
  if (!tuple) {
    return null;
  }

  const owner = extractValueString(tuple["owner"]);
  const text = extractValueString(tuple["text"]);
  const createdRaw = extractValueString(tuple["created-at"]);

  if (!owner || !text || !createdRaw) {
    console.warn("Unexpected receipt tuple JSON", raw);
    return null;
  }

  const createdAt = Number(createdRaw);
  if (Number.isNaN(createdAt)) {
    return null;
  }

  return {
    id,
    owner,
    text,
    createdAt,
  };
}

/**
 * READ: scan all receipts and filter by owner
 */
export async function getReceiptsByOwner(
  ownerAddress: string
): Promise<Receipt[]> {
  const lastId = await getLastId();
  if (!lastId || lastId <= 0) return [];

  const receipts: Receipt[] = [];

  for (let id = 1; id <= lastId; id++) {
    try {
      const receipt = await getReceipt(id, ownerAddress);
      if (receipt && receipt.owner === ownerAddress) {
        receipts.push(receipt);
      }
    } catch (error) {
      console.error("Failed to read receipt", id, error);
    }
  }

  // Newest first
  return receipts.sort((a, b) => b.id - a.id);
}
