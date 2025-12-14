"use client";

import {
  Cl,
  cvToJSON,
  type ClarityValue,
  fetchCallReadOnlyFunction,
} from "@stacks/transactions";
import { STACKS_MAINNET } from "@stacks/network";

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
  creator: string;
  owner: string;
  royaltyRecipient: string;
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
      "Contract address is not configured yet. Set NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS in .env.local after deploying the contract to Stacks mainnet."
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
      network: "mainnet",
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

function extractPrincipal(tuple: Record<string, unknown>, key: string) {
  return extractValueString(tuple[key]);
}

function extractText(tuple: Record<string, unknown>) {
  return extractValueString(tuple["text"]);
}

function extractCreatedAt(tuple: Record<string, unknown>): number | null {
  const createdRaw = extractValueString(tuple["created-at"]);
  if (!createdRaw) return null;
  const parsed = Number(createdRaw);
  return Number.isNaN(parsed) ? null : parsed;
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
    network: STACKS_MAINNET,
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

  const hasAllFields = (obj: Record<string, unknown>) =>
    "creator" in obj &&
    "owner" in obj &&
    "royalty-recipient" in obj &&
    "text" in obj &&
    "created-at" in obj;

  // Kalau node ini wrapper tuple: { type: "tuple", value: { ... } }
  const typeField = node["type"];
  const valueField = node["value"];
  if (typeField === "tuple" && isRecord(valueField) && hasAllFields(valueField)) {
    return valueField;
  }

  // Kalau node ini sendiri sudah punya semua field
  if (hasAllFields(node)) {
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

  const creator = extractPrincipal(tuple, "creator");
  const owner = extractPrincipal(tuple, "owner");
  const royaltyRecipient = extractPrincipal(tuple, "royalty-recipient");
  const text = extractText(tuple);
  const createdAt = extractCreatedAt(tuple);

  if (!creator || !owner || !royaltyRecipient || !text || createdAt === null) {
    console.warn("Unexpected receipt tuple JSON", raw);
    return null;
  }

  return {
    id,
    creator,
    owner,
    royaltyRecipient,
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

/**
 * READ: scan all receipts and filter by creator
 */
export async function getReceiptsByCreator(
  creatorAddress: string
): Promise<Receipt[]> {
  const lastId = await getLastId();
  if (!lastId || lastId <= 0) return [];

  const receipts: Receipt[] = [];

  for (let id = 1; id <= lastId; id++) {
    try {
      const receipt = await getReceipt(id, creatorAddress);
      if (receipt && receipt.creator === creatorAddress) {
        receipts.push(receipt);
      }
    } catch (error) {
      console.error("Failed to read receipt", id, error);
    }
  }

  // Newest first
  return receipts.sort((a, b) => b.id - a.id);
}

/**
 * WRITE: gift a receipt to another address
 */
export async function submitReceiptFor(
  text: string,
  recipient: string
): Promise<StacksTxResponse> {
  const contract = getContractId();

  if (!contract) {
    throw new Error(
      "Contract address is not configured yet. Set NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS in .env.local after deploying the contract to Stacks mainnet."
    );
  }

  const functionArgs = [Cl.stringUtf8(text), Cl.principal(recipient)];
  const request = await loadStacksRequest();

  const response = (await request(
    { forceWalletSelect: false },
    "stx_callContract",
    {
      contract: contract as `${string}.${string}`,
      functionName: "submit-receipt-for",
      functionArgs,
      network: "mainnet",
      postConditionMode: "allow",
    }
  )) as StacksTxResponse;

  return response;
}

/**
 * WRITE: transfer a receipt to a new owner
 */
export async function transferReceipt(
  id: number,
  newOwner: string
): Promise<StacksTxResponse> {
  const contract = getContractId();

  if (!contract) {
    throw new Error(
      "Contract address is not configured yet. Set NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS in .env.local after deploying the contract to Stacks mainnet."
    );
  }

  const functionArgs = [Cl.uint(id), Cl.principal(newOwner)];
  const request = await loadStacksRequest();

  const response = (await request(
    { forceWalletSelect: false },
    "stx_callContract",
    {
      contract: contract as `${string}.${string}`,
      functionName: "transfer-receipt",
      functionArgs,
      network: "mainnet",
      postConditionMode: "allow",
    }
  )) as StacksTxResponse;

  return response;
}

/**
 * WRITE: creator-only change royalty recipient
 */
export async function setReceiptRoyaltyRecipient(
  id: number,
  newRecipient: string
): Promise<StacksTxResponse> {
  const contract = getContractId();

  if (!contract) {
    throw new Error(
      "Contract address is not configured yet. Set NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS in .env.local after deploying the contract to Stacks mainnet."
    );
  }

  const functionArgs = [Cl.uint(id), Cl.principal(newRecipient)];
  const request = await loadStacksRequest();

  const response = (await request(
    { forceWalletSelect: false },
    "stx_callContract",
    {
      contract: contract as `${string}.${string}`,
      functionName: "set-receipt-royalty-recipient",
      functionArgs,
      network: "mainnet",
      postConditionMode: "allow",
    }
  )) as StacksTxResponse;

  return response;
}
