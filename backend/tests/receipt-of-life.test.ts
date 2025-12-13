import { Cl, ClarityType } from "@stacks/transactions";
import { describe, expect, it, beforeAll } from "vitest";

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

// Contract + constants
const CONTRACT_NAME = "receipt-of-life";
const TREASURY = "SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH";
const STAMP_FEE = "1000"; // default
const ROYALTY_FEE = "500"; // default

describe("receipt-of-life", () => {
  beforeAll(() => {
    // make sure state is clean per simnet instantiation (Clarinet does this per test run)
  });

  it("submit-receipt: self-stamp, pays stamp fee, stores receipt #1", () => {
    const text = "My first Receipt on Stacks";

    const tx = simnet.callPublicFn(
      CONTRACT_NAME,
      "submit-receipt",
      [Cl.stringUtf8(text)],
      wallet1
    );

    expect(tx.result).toBeOk(Cl.uint(1));

    expect(tx.events).toContainEqual({
      event: "stx_transfer_event",
      data: {
        sender: wallet1,
        recipient: TREASURY,
        amount: STAMP_FEE,
        memo: "",
      },
    });

    const { result: lastIdResult } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-last-id",
      [],
      wallet1
    );
    expect(lastIdResult).toBeOk(Cl.uint(1));

    const { result: receiptOpt } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-receipt",
      [Cl.uint(1)],
      wallet1
    );
    expect(receiptOpt).toHaveClarityType(ClarityType.OptionalSome);
    const receipt = (receiptOpt as any).value as any;
    expect(receipt.value["owner"]).toBePrincipal(wallet1);
    expect(receipt.value["creator"]).toBePrincipal(wallet1);
    expect(receipt.value["royalty-recipient"]).toBePrincipal(wallet1);
    expect(receipt.value["text"]).toStrictEqual(Cl.stringUtf8(text));
  });

  it("submit-receipt-for: stamps for another owner, pays stamp fee, stores receipt #1", () => {
    const text = "Gift receipt";

    const tx = simnet.callPublicFn(
      CONTRACT_NAME,
      "submit-receipt-for",
      [Cl.stringUtf8(text), Cl.principal(wallet2)],
      wallet1
    );

    expect(tx.result).toBeOk(Cl.uint(1));
    expect(tx.events).toContainEqual({
      event: "stx_transfer_event",
      data: {
        sender: wallet1,
        recipient: TREASURY,
        amount: STAMP_FEE,
        memo: "",
      },
    });

    const { result: receiptOpt } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-receipt",
      [Cl.uint(1)],
      wallet1
    );
    expect(receiptOpt).toHaveClarityType(ClarityType.OptionalSome);
    const receipt = (receiptOpt as any).value as any;
    expect(receipt.value["owner"]).toBePrincipal(wallet2);
    expect(receipt.value["creator"]).toBePrincipal(wallet1);
    expect(receipt.value["royalty-recipient"]).toBePrincipal(wallet1);
    expect(receipt.value["text"]).toStrictEqual(Cl.stringUtf8(text));
  });

  it("transfer-receipt: owner transfers #2 to wallet3, pays royalty to royalty-recipient (creator)", () => {
    // setup: creator stamps for wallet2
    simnet.callPublicFn(
      CONTRACT_NAME,
      "submit-receipt-for",
      [Cl.stringUtf8("Gift receipt"), Cl.principal(wallet2)],
      wallet1
    );

    const tx = simnet.callPublicFn(
      CONTRACT_NAME,
      "transfer-receipt",
      [Cl.uint(1), Cl.principal(wallet3)],
      wallet2 // current owner
    );

    expect(tx.result).toBeOk(Cl.uint(1));
    expect(tx.events).toContainEqual({
      event: "stx_transfer_event",
      data: {
        sender: wallet2,
        recipient: wallet1, // default royalty-recipient (creator)
        amount: ROYALTY_FEE,
        memo: "",
      },
    });

    const { result: receiptOpt } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-receipt",
      [Cl.uint(1)],
      wallet1
    );
    const receipt = (receiptOpt as any).value as any;
    expect(receipt.value["owner"]).toBePrincipal(wallet3);
    expect(receipt.value["creator"]).toBePrincipal(wallet1);
    expect(receipt.value["royalty-recipient"]).toBePrincipal(wallet1);
  });

  it("set-receipt-royalty-recipient: creator changes royalty-recipient for #2", () => {
    // setup: creator stamps and transfers to wallet3 to show owner unchanged
    simnet.callPublicFn(
      CONTRACT_NAME,
      "submit-receipt-for",
      [Cl.stringUtf8("Gift receipt"), Cl.principal(wallet2)],
      wallet1
    );
    simnet.callPublicFn(
      CONTRACT_NAME,
      "transfer-receipt",
      [Cl.uint(1), Cl.principal(wallet3)],
      wallet2
    );

    const tx = simnet.callPublicFn(
      CONTRACT_NAME,
      "set-receipt-royalty-recipient",
      [Cl.uint(1), Cl.principal(wallet3)],
      wallet1 // creator
    );

    expect(tx.result).toBeOk(Cl.uint(1));

    const { result: receiptOpt } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-receipt",
      [Cl.uint(1)],
      wallet1
    );
    const receipt = (receiptOpt as any).value as any;
    expect(receipt.value["royalty-recipient"]).toBePrincipal(wallet3);
    expect(receipt.value["owner"]).toBePrincipal(wallet3); // still owner from previous transfer
  });

  it("transfer-receipt after royalty change: owner pays royalty to new recipient", () => {
    // setup: creator stamps for wallet2, then updates royalty-recipient to wallet3
    simnet.callPublicFn(
      CONTRACT_NAME,
      "submit-receipt-for",
      [Cl.stringUtf8("Gift receipt"), Cl.principal(wallet2)],
      wallet1
    );
    simnet.callPublicFn(
      CONTRACT_NAME,
      "set-receipt-royalty-recipient",
      [Cl.uint(1), Cl.principal(wallet3)],
      wallet1
    );

    const tx = simnet.callPublicFn(
      CONTRACT_NAME,
      "transfer-receipt",
      [Cl.uint(1), Cl.principal(wallet1)],
      wallet2 // current owner
    );

    expect(tx.result).toBeOk(Cl.uint(1));
    // royalty now goes to wallet3 (new royalty-recipient)
    expect(tx.events).toContainEqual({
      event: "stx_transfer_event",
      data: {
        sender: wallet2,
        recipient: wallet3,
        amount: ROYALTY_FEE,
        memo: "",
      },
    });

    const { result: receiptOpt } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-receipt",
      [Cl.uint(1)],
      wallet1
    );
    const receipt = (receiptOpt as any).value as any;
    expect(receipt.value["owner"]).toBePrincipal(wallet1);
    expect(receipt.value["royalty-recipient"]).toBePrincipal(wallet3);
  });

  it("set-fees: non-admin cannot change fees (should err u403)", () => {
    const tx = simnet.callPublicFn(
      CONTRACT_NAME,
      "set-fees",
      [Cl.uint(1500), Cl.uint(750)],
      wallet1
    );
    expect(tx.result).toHaveClarityType(ClarityType.ResponseErr);
    expect((tx.result as any).value).toStrictEqual(Cl.uint(403));
  });
});
