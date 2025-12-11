"use client";

import { request } from "@stacks/connect";
import { Cl } from "@stacks/transactions";

const CONTRACT_NAME = "receipt-of-life";

type StacksTxResponse = {
  txId?: string;
  txRaw?: string;
};

function getContractAddress(): string {
  const addr = process.env.NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS ?? "";
  return addr.trim();
}

export async function submitReceipt(text: string): Promise<StacksTxResponse> {
  const contractAddress = getContractAddress();

  if (!contractAddress) {
    throw new Error(
      "Contract address is not configured yet. Set NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS in .env.local after deploying the contract to testnet."
    );
  }

  // Construct arguments as Clarity values
  const functionArgs = [Cl.stringUtf8(text)];

  const response = (await request("stx_callContract", {
    contractAddress,
    contractName: CONTRACT_NAME,
    functionName: "submit-receipt",
    functionArgs,
  })) as StacksTxResponse;

  return response;
}
