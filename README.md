# Stacks Receipt of Life

## 0. NOTA as a Receipt of Life on Stacks 🧾⚡️

> NOTA = receipt | note  
> **A tiny on-chain receipt that can move, earn royalties, and tell a story.**

This project is a **minimal economic engine** built on the Stacks blockchain. A dApp on Stacks blockchain that lets you stamp a one-sentence receipt of your life on-chain with Clarity 4, part of the $MyReceipt — receipt of life campaign.

At its core is a very simple object:

> **A “Receipt of Life” (NOTA)** → one short line of text, plus
> creator, current owner, royalty recipient, timestamp, and an incremental id.

Around that, the contract wires **two cash-flow rules**:

1. **Stamp Fee (STAMP-FEE)** — every time a new receipt is stamped,
   a small amount of STX flows to a **treasury** wallet.

2. **Royalty Fee (ROYALTY-FEE)** — every time a receipt is transferred,
   a small amount of STX flows to the **royalty recipient** for that receipt.

That’s it. No tokens, no bonding curves, no order book.
Just **text + tiny cash flows**.

Yet from this, you can:

- Reward people who pay attention to their own lives (self-stamped receipts).
- Gift on-chain receipts to others, while keeping creator royalties.
- Transfer receipts across wallets, letting creators (or their chosen addresses) collect a royalty trail.
- Aggregate stats: **how many receipts**, **how much STX flowed**, to whom, and why.

This repo ships:

- ✅ A **Clarity smart contract** on Stacks mainnet.
- ✅ A **Next.js web app** with:

  - Connect wallet
  - Self & gift stamping
  - Receipts dashboard (Owned / Created)
  - On-chain transfer & royalty updates
  - Admin dashboard (read-only for now)

If you’re looking for a **prototype of sustainable micro-economics** around tiny content objects (receipts, diary lines, quotes, etc.), this is meant as a **working blueprint** — for humans and AI agents alike.

### Contract versions
- **Active (v2)**: `SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH.receipt-of-life-v2` (recommended; paging, stats, fee self-transfer mitigation).
- **Legacy (v1)**: `SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH.receipt-of-life` (historical/archival; not used by current UI flows).

---

## 1. Economic Model

### 1.1 Actors

- **Creator**
  The address that originally stamps the receipt. It never changes.

- **Owner**
  The address that currently “holds” the receipt. It can change via transfer.

- **Royalty Recipient**
  The address that receives royalty when the receipt is transferred.
  Initially = creator, but can be reassigned by the creator.

- **Treasury / Admin**
  A designated address that:

  - Receives **STAMP-FEE** on every new receipt.
  - Can update **fees** (STAMP-FEE, ROYALTY-FEE).
  - Can hand over admin role to a new address.

### 1.2 Flows

#### A. Self Stamp (you stamp for yourself)

- Caller: `A`
- Contract: `submit-receipt(text)`

**State after success:**

- `creator = A`
- `owner = A`
- `royalty-recipient = A`
- `text = "…"`
- `created-at = block timestamp`

**STX flow:**

- `A` → `TREASURY`: `STAMP-FEE` microSTX

#### B. Gift Stamp (you stamp for someone else)

- Caller: `A`
- Contract: `submit-receipt-for(text, B)`

**State after success:**

- `creator = A`
- `owner = B`
- `royalty-recipient = A` (by default)
- `text = "…"`, `created-at = …`

**STX flow:**

- `A` → `TREASURY`: `STAMP-FEE` microSTX

So `A` pays to create a receipt **for B**, and `A` keeps a **royalty lane** via `royalty-recipient`.

#### C. Transfer (secondary movement)

- Caller: `B` (current owner)
- Contract: `transfer-receipt(id, C)`

**State after success:**

- `creator` stays the same.
- `owner` becomes `C`.
- `royalty-recipient` stays the same (unless separately updated by creator).

**STX flow:**

- `B` → `royalty-recipient`: `ROYALTY-FEE` microSTX

If the creator kept themselves as royalty recipient, every transfer of that receipt becomes a **tiny dividend** to the creator.

### 1.3 Royalty Routing

The creator can later call:

- `set-receipt-royalty-recipient(id, new-recipient)`

This lets them:

- Route royalties to a new address (e.g. a DAO treasury, a friend, a charity).
- Implement off-chain splits (e.g. use a split wallet as the recipient).

### 1.4 Admin / Fees

The admin (stored as a mutable `admin` data-var):

- Can call `set-fees(new-stamp-fee, new-royalty-fee)`
  to tune the economics as the ecosystem grows.

- Can call `set-admin(new-admin)`
  to hand control to a new address / multisig.

Fees are stored in **microSTX**:

- `STAMP-FEE` — paid on **submit**.
- `ROYALTY-FEE` — paid on **transfer**.

> **Known limitation – “STX Self Transfer Issue”**
> On Stacks mainnet, sending STX **from a wallet to itself** via this contract path currently fails (e.g. admin stamping when treasury == sender, or owner == royalty-recipient).
> v2 is being designed to **detect and skip** such self-transfers (or zero fees) while still completing the rest of the logic.

---

## 2. Smart Contract Overview

### 2.1 Mainnet contract

Current mainnet contract (v1.x):

```text
SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH.receipt-of-life
```

Core storage:

- `last-id: uint`
- `STAMP-FEE: uint`
- `ROYALTY-FEE: uint`
- `admin: principal`
- `receipts: { id: uint } -> {`

  - `creator: principal`
  - `owner: principal`
  - `royalty-recipient: principal`
  - `text: (string-utf8 160)`
  - `created-at: uint`
    `}`

### 2.2 Public functions (v1.x)

Write:

- `submit-receipt(text)`
  Self-stamp; pays `STAMP-FEE` to treasury.

- `submit-receipt-for(text, recipient)`
  Gift-stamp; owner = `recipient`, creator & royalty-recipient = `tx-sender`.

- `transfer-receipt(id, new-owner)`
  Only current `owner` may call; pays `ROYALTY-FEE` to `royalty-recipient`.

- `set-receipt-royalty-recipient(id, new-recipient)`
  Only `creator`; updates `royalty-recipient`.

- `set-fees(new-stamp-fee, new-royalty-fee)`
  Only `admin`; updates both fees.

- `set-admin(new-admin)`
  Only `admin`; changes the admin principal.

Read:

- `get-receipt(id)` → `(optional receipt-tuple)`
- `get-last-id()` → `(ok uint)`

### 2.3 v2 (development)

A second contract `receipt-of-life-v2` is being built with:

- Version metadata (`get-version`, `get-config`).
- Global stats (`get-stats`): total submissions/transfers and fee totals.
- Paging (`get-receipts-range`) for scalable reading.
- Filtered views (by owner / creator / royalty-recipient).
- Built-in mitigation for **STX Self Transfer Issue** (skip self/zero-fee transfers).

v2 is intended as a **drop-in evolution** and reference implementation for more demanding use cases.

---

## 3. Web App Overview

The `web/` directory hosts a **Next.js + React** front-end.

### 3.1 Pages

- `/` — **Stamp a Receipt**

  - Connect Stacks wallet (mainnet).
  - Write a short “Receipt of Life”.
  - Choose:

    - **For me** → `submit-receipt`
    - **As a gift** → `submit-receipt-for` with a recipient address.

  - On success: show Stacks Explorer link for the transaction.

- `/me` — **Your NOTA on Stacks**

  - Two main tabs:

    - **Owned** — receipts where the connected wallet is `owner`.
    - **Created** — receipts where the connected wallet is `creator`.

  - For each receipt, the UI shows:

    - `creator`, `owner`, `royalty recipient`
    - Text and timestamp
    - Links to Stacks Explorer for receipt activity

  - If you are:

    - **Owner** → you can initiate a transfer (calls `transfer-receipt`).
    - **Creator** → you can update the royalty recipient (calls `set-receipt-royalty-recipient`).

- `/admin` — **Admin Dashboard (read-only for now)**

  - Visible only if the connected wallet matches the admin env variable.
  - Shows:

    - Contract address
    - Admin address
    - Fee hints (from env)
    - A clear warning about **STX Self Transfer Issue** and how to avoid it.

> Future tabs (conceptual, already considered in v2 design):
>
> - **Royalty** — receipts where you are the `royalty-recipient` (“Royalty Inbox”).
> - **Activity** — your personalized on-chain activity log across submit / transfer / royalty.

### 3.2 Tech stack

- **Next.js 15+ / App Router**
- **TypeScript**
- Stacks wallet integration (via `@stacks/connect` style flows)
- React hooks to:

  - manage connection state
  - call read/write helpers in `src/lib/receipt-contract.ts`

- Tailwind-style utility classes for styling (simple, minimal UI).

---

## 4. Configuration

The app is configured via `.env.local` in `web/`:

```bash
# REQUIRED – Mainnet contract base address (without .receipt-of-life)
NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS=SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH

# REQUIRED – Admin address (the wallet that can call set-fees, set-admin)
NEXT_PUBLIC_RECEIPT_ADMIN_ADDRESS=SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH

# OPTIONAL – UI-only hints for fees (microSTX)
# These DO NOT change the contract; they only affect the labels in the interface.
# Be careful: 1 STX = 1_000_000 microSTX.
# Example:
#   1,000 microSTX = 0.001 STX
#   500 microSTX   = 0.0005 STX
NEXT_PUBLIC_RECEIPT_STAMP_FEE_MICRO=1000
NEXT_PUBLIC_RECEIPT_ROYALTY_FEE_MICRO=500
```

> The **real source of truth** for fees is always on-chain
> (`STAMP-FEE` and `ROYALTY-FEE` in the contract).
> The env values are there to help the UI display human-friendly numbers.

---

## 5. Running Locally

### 5.1 Prerequisites

- Node.js (LTS)
- Yarn or pnpm
- [Clarinet](https://docs.hiro.so/clarinet) installed for Clarity dev & REPL.

### 5.2 Steps

```bash
# Clone
git clone <this-repo-url>
cd <repo-root>

# Backend: run Clarity checks
cd backend
clarinet check

# Optional: open REPL
clarinet console

# Web: install & run
cd ../web
cp .env.local.example .env.local   # or create and fill variables
# edit .env.local as described above

npm install     # or yarn / pnpm
npm run dev     # start local dev server
```

Then open:

- `http://localhost:3000` → home (Stamp Receipt)
- `http://localhost:3000/my-receipts`
- `http://localhost:3000/admin` (only useful if you connect as admin)

---

## 6. Known Limitations & Gotchas

### 6.1 STX Self Transfer Issue

If the **payer of a fee** (STAMP-FEE or ROYALTY-FEE) is also the **recipient**,
the mainnet transaction currently fails.

Two common cases:

1. **Admin/Treasury self-stamping**

   - `tx-sender == TREASURY`
   - STAMP-FEE tries to go from `TREASURY` to `TREASURY`.

2. **Owner == Royalty Recipient** during transfer

   - `tx-sender == owner == royalty-recipient`
   - ROYALTY-FEE tries to go from `owner` to `owner`.

**Mitigation (current v1 practice):**

- For stamping as admin, prefer **using a separate wallet** for stamping (treasury just collects).
- For transfers, **change royalty-recipient** to a different address (e.g. a “royalty wallet”) before initiating transfer.

**Mitigation (planned v2 contract):**

- Detect when:

  - fee == 0 → skip the STX transfer entirely.
  - sender == receiver → skip the STX transfer.

- Still proceed with **all other state changes** (receipt insert/transfer), so the transaction succeeds.

### 6.2 Scaling reads

v1 reads receipts by scanning id from `1..last-id` and filtering in the front-end.

v2 introduces **paging** and read-only helpers so you can:

- Request **bounded slices** (e.g. 10 receipts at a time).
- Filter by owner / creator / royalty-recipient on-chain.
- Build UIs that paginate infinitely without loading the entire history.

---

## 7. Why this is a useful prototype

Even if you never use this contract as-is, it demonstrates:

- How to turn **text snippets** into **economic objects**.
- How to keep **provenance** (creator) separate from **ownership**.
- How to route **royalties** independently from both (royalty-recipient).
- How to combine:

  - A very simple Clarity contract,
  - A clean Next.js front-end,
  - And a realistic mainnet deployment workflow.

You can fork this to build:

- Personal diaries where every entry is transferrable and royalty-bearing.
- Membership passes with creator royalties on secondary transfers.
- Micro-patronage systems where supporters stamp messages **for** creators and fund a shared treasury.
- On-chain quote libraries, receipts for events, daily affirmations — with hard-wired fee flows.

---

## 8. Roadmap (Ideas)

- **Deploy and cut over to v2** with:

  - Versioned metadata
  - Global stats
  - Paged reads and filtered queries
  - Self-transfer mitigation

- **Royalty Inbox tab**
  A dedicated view of receipts where you are the royalty recipient.

- **Activity tab**
  Your personal log of submit / transfer / royalty events, filtered by wallet.

- **Better fee UX**

  - Read real on-chain fees into UI.
  - Graph aggregate flows over time.

- **Multi-wallet / multi-role patterns**
  Templates for using:

  - one wallet for stamping,
  - one for royalties,
  - one for treasury/admin.

---

If you build on this, fork it, or use it as a teaching example, that’s exactly the point:
**to show how something as small as a receipt can anchor an entire micro-economy.**

