;; Stacks Receipt of Life is NOTA as a Receipt of Life on Stacks
;; Clarity 4 contract

(define-constant TREASURY 'SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH)

;; Creator fee in microSTX (1 STX = 1_000_000 microSTX).
;; This is a small fixed fee sent to the treasury on every receipt submission.
(define-constant CREATOR-FEE u1000)

;; Incremental identifier for receipts
(define-data-var last-id uint u0)

;; Stored receipts:
;; - id: auto-incremented uint
;; - owner: principal that submitted the receipt
;; - text: the "Receipt of Life" message (max 160 chars)
;; - created-at: timestamp of the Stacks block when it was submitted
(define-map receipts
  { id: uint }
  {
    owner: principal,
    text: (string-utf8 160),
    created-at: uint
  }
)

(define-public (submit-receipt (text (string-utf8 160)))
  (let (
        (new-id (+ (var-get last-id) u1))
        (now    stacks-block-time)
       )
    (begin
      ;; persist new id
      (var-set last-id new-id)

      ;; save receipt
      (map-insert receipts
        { id: new-id }
        {
          owner: tx-sender,
          text: text,
          created-at: now
        })

      ;; send a small creator fee to the treasury
      (try! (stx-transfer? CREATOR-FEE tx-sender TREASURY))

      ;; emit a simple event for indexers / explorers
      (print
        {
          kind: "receipt-submitted",
          id: new-id,
          owner: tx-sender,
          created-at: now
        })

      (ok new-id)
    )))

;; Read-only helper: get a receipt by id
(define-read-only (get-receipt (id uint))
  (map-get? receipts { id: id }))

;; Read-only helper: get the current last-id
(define-read-only (get-last-id)
  (ok (var-get last-id)))
