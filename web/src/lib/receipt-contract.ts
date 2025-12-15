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

const DEFAULT_CONTRACT_NAME = "receipt-of-life";
// Set NEXT_PUBLIC_RECEIPT_CONTRACT_NAME to "receipt-of-life-v2" for the active mainnet contract.
export const CONTRACT_NAME =
  (process.env.NEXT_PUBLIC_RECEIPT_CONTRACT_NAME ?? DEFAULT_CONTRACT_NAME).trim() ||
  DEFAULT_CONTRACT_NAME;
export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS ?? "").trim();
export const IS_V2 = CONTRACT_NAME === "receipt-of-life-v2"; // fallback to v1 behavior when not v2

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
  // full "ST...address.<contract-name>"
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

// Unwrap (ok (tuple ...)) shapes from cvToJSON
function extractOkTuple(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;
  const outerValue = raw["value"];
  if (!isRecord(outerValue)) return null;
  const inner = outerValue["value"];
  if (isRecord(inner)) {
    return inner as Record<string, unknown>;
  }
  return outerValue as Record<string, unknown>;
}

// Unwrap (ok (list ...)) shapes from cvToJSON
function extractOkList(raw: unknown): unknown[] | null {
  if (!isRecord(raw)) return null;
  const outerValue = raw["value"];
  if (Array.isArray(outerValue)) return outerValue as unknown[];
  if (isRecord(outerValue)) {
    const inner = outerValue["value"];
    if (Array.isArray(inner)) return inner as unknown[];
  }
  return null;
}

function parseReceiptFromTuple(
  tuple: Record<string, unknown>,
  idHint?: number
): Receipt | null {
  const creator = extractPrincipal(tuple, "creator");
  const owner = extractPrincipal(tuple, "owner");
  const royaltyRecipient = extractPrincipal(tuple, "royalty-recipient");
  const text = extractText(tuple);
  const createdAt = extractCreatedAt(tuple);

  if (!creator || !owner || !royaltyRecipient || !text || createdAt === null) {
    console.warn("Unexpected receipt tuple JSON", tuple);
    return null;
  }

  return {
    id: typeof idHint === "number" ? idHint : -1,
    creator,
    owner,
    royaltyRecipient,
    text,
    createdAt,
  };
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

  return parseReceiptFromTuple(tuple, id);
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
 * READ: paged receipts scan
 */
export async function getReceiptsRange(
  startId: number | bigint,
  limit: number
): Promise<Receipt[]> {
  const raw = await readOnlyCall("get-receipts-range", [
    Cl.uint(startId),
    Cl.uint(limit),
  ]);

  if (!isRecord(raw)) return [];

  const list = raw["value"];
  if (!Array.isArray(list)) return [];

  const receipts: Receipt[] = [];
  for (const item of list) {
    const tuple = findReceiptTuple(item);
    if (!tuple) continue;
    const idRaw = extractValueString((tuple as Record<string, unknown>)["id"]);
    const idParsed = idRaw ? Number(idRaw) : undefined;
    const parsed = parseReceiptFromTuple(tuple, idParsed);
    if (parsed) receipts.push(parsed);
  }

  return receipts;
}

/**
 * READ: receipts by royalty-recipient (paged)
 */
export async function getReceiptsByRoyaltyRecipient(
  recipientAddress: string,
  startId: number | bigint,
  limit: number
): Promise<Receipt[]> {
  const raw = await readOnlyCall(
    "get-receipts-by-royalty-recipient",
    [Cl.principal(recipientAddress), Cl.uint(startId), Cl.uint(limit)],
    recipientAddress
  );

  if (!isRecord(raw)) return [];
  const list = raw["value"];
  if (!Array.isArray(list)) return [];

  const receipts: Receipt[] = [];
  for (const item of list) {
    const tuple = findReceiptTuple(item);
    if (!tuple) continue;
    const idRaw = extractValueString((tuple as Record<string, unknown>)["id"]);
    const idParsed = idRaw ? Number(idRaw) : undefined;
    const parsed = parseReceiptFromTuple(tuple, idParsed);
    if (parsed) receipts.push(parsed);
  }

  return receipts;
}

type Version = { major: number; minor: number; patch: number };

export async function getVersion(): Promise<Version | null> {
  try {
    const raw = await readOnlyCall("get-version");
    const tuple = extractOkTuple(raw);
    if (!tuple) return null;

    const majorStr = extractValueString(tuple["major"]);
    const minorStr = extractValueString(tuple["minor"]);
    const patchStr = extractValueString(tuple["patch"]);

    if (!majorStr || !minorStr || !patchStr) return null;

    const major = Number(majorStr);
    const minor = Number(minorStr);
    const patch = Number(patchStr);

    if ([major, minor, patch].some((n) => Number.isNaN(n))) return null;
    return { major, minor, patch };
  } catch (err) {
    console.error("getVersion failed", `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`, err);
    return null;
  }
}

type Config = {
  contractOwner: string;
  treasury: string;
  admin: string;
  stampFee: number;
  royaltyFee: number;
  lastId: number;
  version: Version | null;
};

export async function getConfig(): Promise<Config | null> {
  try {
    const raw = await readOnlyCall("get-config");
    const tuple = extractOkTuple(raw);
    if (!tuple) return null;

    const contractOwner = extractPrincipal(tuple, "contract-owner");
    const treasury = extractPrincipal(tuple, "treasury");
    const admin = extractPrincipal(tuple, "admin");
    const stampFeeStr = extractValueString(tuple["stamp-fee"]);
    const royaltyFeeStr = extractValueString(tuple["royalty-fee"]);
    const lastIdStr = extractValueString(tuple["last-id"]);

    const version = await getVersion();

    if (!contractOwner || !treasury || !admin) return null;
    if (!stampFeeStr || !royaltyFeeStr || !lastIdStr) return null;

    const stampFee = Number(stampFeeStr);
    const royaltyFee = Number(royaltyFeeStr);
    const lastId = Number(lastIdStr);
    if ([stampFee, royaltyFee, lastId].some((n) => Number.isNaN(n))) return null;

    return {
      contractOwner,
      treasury,
      admin,
      stampFee,
      royaltyFee,
      lastId,
      version,
    };
  } catch (err) {
    console.error("getConfig failed", `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`, err);
    return null;
  }
}

type Stats = {
  lastId: number;
  totalSubmissions: number;
  totalTransfers: number;
  totalStampFee: number;
  totalRoyaltyFee: number;
  version: Version | null;
};

export async function getStats(): Promise<Stats | null> {
  try {
    const raw = await readOnlyCall("get-stats");
    const tuple = extractOkTuple(raw);
    if (!tuple) return null;

    const lastIdStr = extractValueString(tuple["last-id"]);
    const totalSubStr = extractValueString(tuple["total-submissions"]);
    const totalTransfersStr = extractValueString(tuple["total-transfers"]);
    const totalStampFeeStr = extractValueString(tuple["total-stamp-fee"]);
    const totalRoyaltyFeeStr = extractValueString(tuple["total-royalty-fee"]);
    const version = await getVersion();

    if (
      !lastIdStr ||
      !totalSubStr ||
      !totalTransfersStr ||
      !totalStampFeeStr ||
      !totalRoyaltyFeeStr
    ) {
      return null;
    }

    const lastId = Number(lastIdStr);
    const totalSubmissions = Number(totalSubStr);
    const totalTransfers = Number(totalTransfersStr);
    const totalStampFee = Number(totalStampFeeStr);
    const totalRoyaltyFee = Number(totalRoyaltyFeeStr);
    const nums = [lastId, totalSubmissions, totalTransfers, totalStampFee, totalRoyaltyFee];
    if (nums.some((n) => Number.isNaN(n))) return null;

    return {
      lastId,
      totalSubmissions,
      totalTransfers,
      totalStampFee,
      totalRoyaltyFee,
      version,
    };
  } catch (err) {
    console.error("getStats failed", `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`, err);
    return null;
  }
}

type PagedReceiptsResult = { items: Receipt[]; nextStartId: bigint | null };
type ActivityPagedResult = { items: Receipt[]; nextHighestId: bigint | null };

function clampLimit(limit?: number): number {
  const max = 10; // matches MAX-PAGE-SIZE in v2 contract
  if (!limit || limit <= 0) return max;
  return limit > max ? max : limit;
}

function computeNextStart(
  currentStart: bigint,
  pageSize: number,
  itemsLength: number,
  lastId?: number
): bigint | null {
  if (itemsLength === 0) return null;
  const next = currentStart + BigInt(pageSize);
  if (typeof lastId === "number" && lastId > 0 && next > BigInt(lastId)) {
    return null;
  }
  return next;
}

/**
 * READ (UI helper): owned receipts, paged for v2, legacy full-scan for v1
 */
export async function getOwnedReceiptsPaged(
  address: string,
  startId: bigint | null,
  limit?: number
): Promise<PagedReceiptsResult> {
  if (!IS_V2) {
    const items = await getReceiptsByOwner(address);
    return { items, nextStartId: null };
  }

  const pageSize = clampLimit(limit);
  const start = startId ?? BigInt(1);
  const raw = await readOnlyCall(
    "get-receipts-by-owner",
    [Cl.principal(address), Cl.uint(start), Cl.uint(pageSize)],
    address
  );

  const list = extractOkList(raw);
  if (!list) return { items: [], nextStartId: null };

  const items: Receipt[] = [];
  for (const item of list) {
    const tuple = findReceiptTuple(item);
    if (!tuple) continue;
    const idRaw = extractValueString((tuple as Record<string, unknown>)["id"]);
    const idParsed = idRaw ? Number(idRaw) : undefined;
    const parsed = parseReceiptFromTuple(tuple, idParsed);
    if (parsed) items.push(parsed);
  }

  const stats = await getStats();
  const nextStartId = computeNextStart(start, pageSize, items.length, stats?.lastId);

  return { items, nextStartId };
}

/**
 * READ (UI helper): created receipts, paged for v2, legacy full-scan for v1
 */
export async function getCreatedReceiptsPaged(
  address: string,
  startId: bigint | null,
  limit?: number
): Promise<PagedReceiptsResult> {
  if (!IS_V2) {
    const items = await getReceiptsByCreator(address);
    return { items, nextStartId: null };
  }

  const pageSize = clampLimit(limit);
  const start = startId ?? BigInt(1);
  const raw = await readOnlyCall(
    "get-receipts-by-creator",
    [Cl.principal(address), Cl.uint(start), Cl.uint(pageSize)],
    address
  );

  const list = extractOkList(raw);
  if (!list) return { items: [], nextStartId: null };

  const items: Receipt[] = [];
  for (const item of list) {
    const tuple = findReceiptTuple(item);
    if (!tuple) continue;
    const idRaw = extractValueString((tuple as Record<string, unknown>)["id"]);
    const idParsed = idRaw ? Number(idRaw) : undefined;
    const parsed = parseReceiptFromTuple(tuple, idParsed);
    if (parsed) items.push(parsed);
  }

  const stats = await getStats();
  const nextStartId = computeNextStart(start, pageSize, items.length, stats?.lastId);

  return { items, nextStartId };
}

/**
 * READ (UI helper): receipts where address is royalty-recipient
 */
export async function getRoyaltyReceiptsPaged(
  address: string,
  startId: bigint | null,
  limit?: number
): Promise<PagedReceiptsResult> {
  if (!IS_V2) {
    // v1 fallback: full scan, filter client-side
    const lastId = await getLastId();
    if (!lastId || lastId <= 0) return { items: [], nextStartId: null };

    const receipts: Receipt[] = [];
    for (let id = 1; id <= lastId; id++) {
      try {
        const receipt = await getReceipt(id, address);
        if (receipt && receipt.royaltyRecipient === address) {
          receipts.push(receipt);
        }
      } catch (error) {
        console.error("Failed to read receipt", id, error);
      }
    }
    return { items: receipts.sort((a, b) => b.id - a.id), nextStartId: null };
  }

  const pageSize = clampLimit(limit);
  const start = startId ?? BigInt(1);
  const raw = await readOnlyCall(
    "get-receipts-by-royalty-recipient",
    [Cl.principal(address), Cl.uint(start), Cl.uint(pageSize)],
    address
  );

  const list = extractOkList(raw);
  if (!list) return { items: [], nextStartId: null };

  const items: Receipt[] = [];
  for (const item of list) {
    const tuple = findReceiptTuple(item);
    if (!tuple) continue;
    const idRaw = extractValueString((tuple as Record<string, unknown>)["id"]);
    const idParsed = idRaw ? Number(idRaw) : undefined;
    const parsed = parseReceiptFromTuple(tuple, idParsed);
    if (parsed) items.push(parsed);
  }

  const stats = await getStats();
  const nextStartId = computeNextStart(start, pageSize, items.length, stats?.lastId);

  return { items, nextStartId };
}

/**
 * READ (UI helper): global activity, newest first
 */
export async function getActivityReceiptsPaged(
  highestId: bigint | null,
  limit?: number
): Promise<ActivityPagedResult> {
  if (!IS_V2) {
    // v1 fallback: scan all, no paging
    const lastId = await getLastId();
    if (!lastId || lastId <= 0) return { items: [], nextHighestId: null };

    const receipts: Receipt[] = [];
    for (let id = 1; id <= lastId; id++) {
      try {
        const receipt = await getReceipt(id);
        if (receipt) receipts.push(receipt);
      } catch (error) {
        console.error("Failed to read receipt", id, error);
      }
    }
    const sorted = receipts.sort((a, b) => b.id - a.id);
    return { items: sorted, nextHighestId: null };
  }

  try {
    const pageSize = clampLimit(limit);

    let effectiveHighest: bigint | null = highestId;
    if (effectiveHighest === null) {
      const stats = await getStats();
      if (!stats || stats.lastId === 0) return { items: [], nextHighestId: null };
      effectiveHighest = BigInt(stats.lastId);
    }

    const startIdNum = effectiveHighest <= 0 ? BigInt(1) : effectiveHighest;
    const backSpan = BigInt(pageSize - 1);
    const candidateStart =
      startIdNum > backSpan ? startIdNum - backSpan : BigInt(1);
    const startId = candidateStart < BigInt(1) ? BigInt(1) : candidateStart;

  const raw = await readOnlyCall("get-receipts-range", [
    Cl.uint(startId),
    Cl.uint(pageSize),
  ]);
  const list = extractOkList(raw);
  if (!list) return { items: [], nextHighestId: null };

    const items: Receipt[] = [];
    for (const item of list) {
      const tuple = findReceiptTuple(item);
      if (!tuple) continue;
      const idRaw = extractValueString((tuple as Record<string, unknown>)["id"]);
      const idParsed = idRaw ? Number(idRaw) : undefined;
      const parsed = parseReceiptFromTuple(tuple, idParsed);
      if (parsed) items.push(parsed);
    }

    const sorted = items.sort((a, b) => b.id - a.id);

    let nextHighestId: bigint | null = null;
    if (items.length === pageSize && startId > BigInt(1)) {
      nextHighestId = startId - BigInt(1);
    }

    return { items: sorted, nextHighestId };
  } catch (error) {
    console.error("Failed to load activity receipts", error);
    return { items: [], nextHighestId: null };
  }
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

/**
 * WRITE: admin-only update fees (microSTX)
 */
export async function setFees(
  newStampFeeMicro: bigint,
  newRoyaltyFeeMicro: bigint
): Promise<void> {
  const contract = getContractId();

  if (!contract) {
    throw new Error(
      "Contract address is not configured yet. Set NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS in .env.local after deploying the contract to Stacks mainnet."
    );
  }

  const functionArgs = [Cl.uint(newStampFeeMicro), Cl.uint(newRoyaltyFeeMicro)];
  const request = await loadStacksRequest();

  const response = (await request(
    { forceWalletSelect: false },
    "stx_callContract",
    {
      contract: contract as `${string}.${string}`,
      functionName: "set-fees",
      functionArgs,
      network: "mainnet",
      postConditionMode: "allow",
    }
  )) as StacksTxResponse;

  if (!response || !response.txid) {
    throw new Error("set-fees transaction was not submitted.");
  }
}

/**
 * WRITE: admin-only change admin principal
 */
export async function setAdmin(newAdmin: string): Promise<void> {
  const contract = getContractId();

  if (!contract) {
    throw new Error(
      "Contract address is not configured yet. Set NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS in .env.local after deploying the contract to Stacks mainnet."
    );
  }

  const functionArgs = [Cl.principal(newAdmin)];
  const request = await loadStacksRequest();

  const response = (await request(
    { forceWalletSelect: false },
    "stx_callContract",
    {
      contract: contract as `${string}.${string}`,
      functionName: "set-admin",
      functionArgs,
      network: "mainnet",
      postConditionMode: "allow",
    }
  )) as StacksTxResponse;

  if (!response || !response.txid) {
    throw new Error("set-admin transaction was not submitted.");
  }
}
