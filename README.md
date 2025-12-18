# Stacks Receipt of Life (NOTA) — v2 🧾⚡️

---

---

## Maintenance by Prof. NOTA Evergreen Standard

This repo is intended to stay evergreen while remaining production-safe.

### Runtime

- Node: **24.x** (see `.nvmrc` and `package.json#engines`)
  - ~~example alternatives: 22.x / 20.x (adjust if platform requires)~~
- Package manager:
  - **NPM** (lockfile: `package-lock.json`)
  - ~~Yarn (lockfile: `yarn.lock`)~~
  - ~~PNPM (lockfile: `pnpm-lock.yaml`)~~
- Deploy target:
  - **Vercel**
  - ~~Netlify~~
  - ~~Self-hosted / Docker~~
  - ~~Other platform (document explicitly)~~

### Monthly Safe Updates (recommended)

1. Check what’s outdated:
   - `npm outdated`
   - ~~yarn outdated~~
   - ~~pnpm outdated~~
2. Upgrade safe (patch/minor) versions:
   - `npm update`
   - or upgrade specific packages shown as non-major
3. Verify:
   - `npm audit --audit-level=moderate`
   - ~~yarn audit --level moderate~~
   - ~~pnpm audit~~
   - `npm run build`
4. Deploy:
   - **Vercel auto-deploy from `main`**
   - ~~manual deploy according to platform workflow~~

### Major Updates (quarterly / scheduled)

Major upgrades (framework, runtime, or core tooling) must be done one at a time, with a dedicated PR and full testing.

Examples of major upgrades:

- Node major version
- Next.js / React major version
- Tailwind CSS major version
- Package manager major version

---

---

> NOTA = receipt | note  
> **A tiny on-chain receipt that can move, earn royalties, and tell a story.**

**Stacks Receipt of Life** is a minimal economic engine on Stacks: you “stamp” a one-sentence receipt on-chain, and that tiny object can be transferred while producing small, hard-wired STX cash flows.

At its core is a simple object:

> **A Receipt of Life (NOTA)** → one short line of text + creator, owner, royalty recipient, timestamp, and incremental id.

And it wires **two fee rules**:

1. **Stamp Fee (STAMP-FEE)** — paid when a new receipt is stamped.
2. **Royalty Fee (ROYALTY-FEE)** — paid when a receipt is transferred.

No token, no bonding curve, no order book — just **text + tiny cash flows**.

---

## Contract Versions (Mainnet)

- **Active (v2)**: `SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH.receipt-of-life-v2`
- **Legacy (v1)**: `SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH.receipt-of-life` (archival)

> The current UI flows should target **v2**.

---

## 1) Economic Model

### 1.1 Actors

- **Creator**  
  The address that stamps the receipt. Never changes.

- **Owner**  
  The address that currently holds the receipt. Changes via transfer.

- **Royalty Recipient**  
  The address that receives royalties on transfer.  
  Defaults to creator, but can be reassigned by the creator.

- **Treasury**  
  Receives `STAMP-FEE` on every successful stamp (unless fee is skipped).

- **Admin**  
  Can update fees and change admin.

### 1.2 Flows

#### A) Self Stamp

- Caller: `A`
- Call: `submit-receipt(text)`

State:

- `creator = A`
- `owner = A`
- `royalty-recipient = A`
- `created-at = block timestamp`

STX flow:

- `A → TREASURY`: `STAMP-FEE` (microSTX), **unless skipped** (see Fee Safety).

#### B) Gift Stamp

- Caller: `A`
- Call: `submit-receipt-for(text, B)`

State:

- `creator = A`
- `owner = B`
- `royalty-recipient = A` (default)
- `created-at = block timestamp`

STX flow:

- `A → TREASURY`: `STAMP-FEE` (microSTX), **unless skipped**.

#### C) Transfer

- Caller: current owner `B`
- Call: `transfer-receipt(id, C)`

State:

- `owner = C` (creator stays the same)
- `royalty-recipient` stays the same unless updated separately

STX flow:

- `B → royalty-recipient`: `ROYALTY-FEE` (microSTX), **unless skipped**.

### 1.3 Fee Safety (v2)

Stacks has a known limitation: STX transfers **from a principal to itself** can fail in contract paths.

**v2 mitigates this at the contract level** by skipping the STX transfer when:

- fee is `0`, OR
- `tx-sender == recipient` (self transfer)

Importantly: **state changes still proceed** (receipt mint/transfer succeeds), and stats only count _fees actually paid_.

---

## 2) Smart Contract (v2) — API Reference

### 2.1 Storage

- `receipts` map:
  - `id: uint` → `{ creator, owner, royalty-recipient, text (string-utf8 160), created-at }`
- data-vars:
  - `admin: principal`
  - `STAMP-FEE: uint` (microSTX)
  - `ROYALTY-FEE: uint` (microSTX)
  - `last-id: uint`
  - stats:
    - `total-submissions: uint`
    - `total-transfers: uint`
    - `total-stamp-fee: uint` (sum of fees actually paid)
    - `total-royalty-fee: uint` (sum of fees actually paid)

### 2.2 Write Functions

- `submit-receipt(text)`

  - Stamps a receipt for yourself (owner = tx-sender).

- `submit-receipt-for(text, recipient)`

  - Stamps a receipt as a gift (owner = recipient).

- `transfer-receipt(id, new-owner)`

  - Transfers ownership. Only current owner can call.

- `set-receipt-royalty-recipient(id, new-recipient)`

  - Updates royalty recipient. Only creator can call.

- `set-fees(new-stamp-fee, new-royalty-fee)`

  - Updates both fees. Only admin can call.

- `set-admin(new-admin)`
  - Updates admin. Only admin can call.

### 2.3 Read-Only Functions

- `get-receipt(id)`

  - Returns `(optional receipt)`.

- `get-last-id()`

  - Returns `(ok uint)`.

- `get-version()`

  - Returns `{ major, minor, patch }`.

- `get-config()`

  - Returns:
    - `contract-owner`, `treasury`, `admin`
    - `stamp-fee`, `royalty-fee`
    - `last-id`
    - version fields

- `get-stats()`
  - Returns:
    - version fields
    - `last-id`, `total-submissions`, `total-transfers`
    - `total-stamp-fee`, `total-royalty-fee`

#### Paging Reads (max 10 items per call)

v2 provides bounded reads designed for UI pagination:

- `get-receipts-range(start-id, limit)`

  - Returns up to `min(limit, 10)` receipts starting from `start-id`.

- `get-receipts-by-owner(owner, start-id, limit)`
- `get-receipts-by-creator(creator, start-id, limit)`
- `get-receipts-by-royalty-recipient(royalty-recipient, start-id, limit)`

Notes:

- `start-id` should usually begin at `1`.
- The contract enforces a fixed max page size (`10`) to keep reads predictable.

---

## 3) Web App

The `web/` directory contains a Next.js app:

- Wallet connect
- Self & gift stamping
- Receipt dashboard (Owned / Created)
- On-chain transfer & royalty updates
- Admin dashboard (fees/admin management or read-only depending on UI)

---

## 4) Configuration (Web)

Set these in `web/.env.local`:

```bash
NEXT_PUBLIC_RECEIPT_CONTRACT_ADDRESS=SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH
NEXT_PUBLIC_RECEIPT_ADMIN_ADDRESS=SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH

# Optional UI hints only (microSTX)
NEXT_PUBLIC_RECEIPT_STAMP_FEE_MICRO=1000
NEXT_PUBLIC_RECEIPT_ROYALTY_FEE_MICRO=500
```

> Source of truth for fees is always on-chain via `get-config()`.

---

## 5) Running Locally

```bash
git clone <this-repo-url>
cd <repo-root>

# Contract checks
cd backend
clarinet check
clarinet console

# Web
cd ../web
cp .env.local.example .env.local  # or create your own
npm install
npm run dev
```

Open:

- `http://localhost:3000`
- `http://localhost:3000/me`
- `http://localhost:3000/admin`

---

## 6) Why this is useful

This repo demonstrates:

- Tiny content objects with provenance (creator) and ownership (owner)
- Royalty routing independent from ownership
- A minimal, sustainable micro-economy on Stacks using only STX and simple rules
- A UI-friendly v2 contract with paging + global stats + fee safety

---
