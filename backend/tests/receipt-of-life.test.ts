import { Cl, ClarityType } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;

// Contract + constants
const CONTRACT_NAME = "receipt-of-life";
const TREASURY = "SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH";
const CREATOR_FEE = "1000"; // microSTX

describe("receipt-of-life", () => {
  it("submits a receipt, updates last-id, and stores the entry", () => {
    const text = "My first NOTA on Stacks";

    // 1) Call the public function
    const tx = simnet.callPublicFn(
      CONTRACT_NAME,
      "submit-receipt",
      [Cl.stringUtf8(text)],
      wallet1
    );

    // response should be (ok u1)
    expect(tx.result).toBeOk(Cl.uint(1));

    // 2) Check that STX creator fee was transferred to the treasury
    expect(tx.events).toContainEqual({
      event: "stx_transfer_event",
      data: {
        sender: wallet1,
        recipient: TREASURY,
        amount: CREATOR_FEE,
        memo: "",
      },
    });

    // 3) Read last-id: should be (ok u1)
    const { result: lastIdResult } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-last-id",
      [],
      wallet1
    );
    expect(lastIdResult).toBeOk(Cl.uint(1));

    // 4) Read the stored receipt: should be (some <tuple>)
    const { result: receiptOpt } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-receipt",
      [Cl.uint(1)],
      wallet1
    );

    // We don't assert every field yet (created-at is dynamic),
    // but we at least ensure it is `some`, not `none`.
    expect(receiptOpt).toHaveClarityType(ClarityType.OptionalSome);
  });
});
