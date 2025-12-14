# Receipt of Life Contracts — v1 vs v2

## Overview

- The "Receipt of Life" contracts record a short message (NOTA) with creator/owner metadata on Stacks.
- v2 (`receipt-of-life-v2`) is the recommended target for all new integrations.
- v1 (`receipt-of-life`) remains deployed/available but lacks paging/stats and can fail on STX self-transfers of fees.

## v1 vs v2 (what changed)

- **v1 (`receipt-of-life`)**

  - Creator/owner fields, royalty-recipient per receipt.
  - STAMP-FEE from `tx-sender -> TREASURY` on submit; ROYALTY-FEE from `tx-sender (owner) -> royalty-recipient` on transfer.
  - No paging helpers, no global stats.
  - STX self-transfer edge case: if sender == recipient for a fee, the tx can fail.

- **v2 (`receipt-of-life-v2`)**
  - Same core model (creator, owner, royalty-recipient per receipt).
  - Added paging and filtered reads: `get-receipts-range`, `get-receipts-by-owner`, `get-receipts-by-creator`, `get-receipts-by-royalty-recipient`.
  - Added global stats via `get-stats` (submissions, transfers, fees tallied when applied).
  - Fee safety: STAMP-FEE and ROYALTY-FEE are **skipped** when the fee is `u0` or when sender == recipient, preventing self-transfer failures. The tx still succeeds; the fee counters do not increment in the skipped cases.

## Frontend integration guidance

- **Owned receipts**: use `get-receipts-by-owner(owner, start-id, limit)` with paging.
- **Created receipts**: use `get-receipts-by-creator(creator, start-id, limit)` with paging.
- **Royalty inbox**: use `get-receipts-by-royalty-recipient(recipient, start-id, limit)` with paging.
- **Global stats panel**: use `get-stats`; for config/version display, use `get-config` and `get-version`.

## STX self-transfer mitigation (v2)

- STAMP-FEE is **not** charged when `STAMP-FEE == u0` or `tx-sender == TREASURY`. Submissions still succeed; `total-submissions` increments, but `total-stamp-fee` does **not**.
- ROYALTY-FEE is **not** charged when `ROYALTY-FEE == u0` or `tx-sender == royalty-recipient`. Transfers still succeed; `total-transfers` increments, but `total-royalty-fee` does **not**.
- Use v2 helpers for any new UI so these mitigations apply automatically.
