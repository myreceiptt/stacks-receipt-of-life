# Receipt Stamping Commands

This folder contains scripts to stamp receipts on mainnet. All commands should be run from the `backend/` directory.

## Setup (before running any command)

1. Copy the example files:

   ```sh
   cp backend/receipt/key.example backend/receipt/.key.local
   cp backend/receipt/content.example.json backend/receipt/content.json
   cp backend/receipt/recipients.example.json backend/receipt/recipients.json
   ```

2. Edit the files:

   - `backend/receipt/.key.local`: add one mnemonic or private key per line.
   - `backend/receipt/content.json`: add receipt text items.
   - `backend/receipt/recipients.json`: optional; only used if you customize the scripts back to use it.

3. (Optional) Clean previous runs:

    ```sh
    rm -f backend/receipt/.progress.json backend/receipt/.stamp.pid
    ```

## One-time stamp (single transaction)

Run one random receipt stamp using a random sender (indices 0–2) and recipient pool (indices 0–47). Uses fee override to avoid rate limits.

```sh
STAMP_FEE_MICROSTX=15000 npm run stamp:once
```

Notes:

- Adjust `STAMP_FEE_MICROSTX` if you want a different fixed fee.
- If you omit the fee override, the script will attempt fee estimation and may hit rate limits.

## Run batch stamping (continuous until all content is stamped)

Runs through all content in `content.json` in order, saving progress in `.progress.json`. Waits 47 seconds between successful stamps by default.

```sh
STAMP_FEE_MICROSTX=15000 npm run stamp:batch
```

Optional tuning:

- `STAMP_INTERVAL_SECONDS=47` to change spacing between transactions.
- `STAMP_MAX_RETRIES=3` to change per-item retry attempts.
- `STAMP_FEE_MICROSTX=15000` to avoid fee-estimation rate limits.

## Stop a running batch

Stops the batch process by using the PID stored in `.stamp.pid`.

```sh
npm run stamp:stop
```

## Set input files

Default files live in `backend/receipt/`. You can override these paths with env vars:

```sh
RECEIPT_CONTENT_FILE=content.json
RECEIPT_KEYS_FILE=.key.local
RECEIPT_PROGRESS_FILE=.progress.json
RECEIPT_PID_FILE=.stamp.pid
```

## Key format

The `.key.local` file supports:

- A raw private key per line, or
- A 12/24-word mnemonic per line

With mnemonics, the scripts derive:

- Senders from index 0–2
- Recipients from index 0–47

If the recipient equals the sender, the script uses `submit-receipt` (no gift).
