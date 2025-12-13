;; Stacks Receipt of Life is NOTA as a Receipt of Life on Stacks
;; Clarity 4 contract
;; STAMP-FEE is paid to TREASURY on submit (submit-receipt / submit-receipt-for).
;; ROYALTY-FEE is paid to the current royalty-recipient on transfer-receipt.

(define-constant TREASURY 'SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH)

;; contract owner and mutable admin
(define-constant CONTRACT-OWNER 'SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH)
;; Mutable admin; default = contract deployer (in this case, same as CONTRACT-OWNER)
(define-data-var admin principal CONTRACT-OWNER)

;; Fees (mutable)
(define-data-var STAMP-FEE uint u1000)
(define-data-var ROYALTY-FEE uint u500)

;; Errors
(define-constant ERR-NOT-OWNER (err u401))
(define-constant ERR-NOT-CREATOR (err u402))
(define-constant ERR-NOT-AUTHORIZED (err u403))
(define-constant ERR-NOT-FOUND (err u404))

;; Incremental identifier for receipts
(define-data-var last-id uint u0)

;; Stored receipts:
;; - id: auto-incremented uint
;; - creator: principal that submitted the receipt originally
;; - owner: current principal that holds the receipt
;; - royalty-recipient: principal that receives transfer royalties (default: creator)
;; - text: the "Receipt of Life" message (max 160 chars)
;; - created-at: timestamp of the Stacks block when it was submitted
(define-map receipts
  { id: uint }
  {
    creator: principal,
    owner: principal,
    royalty-recipient: principal,
    text: (string-utf8 160),
    created-at: uint
  }
)

;; Admin helper
(define-private (is-admin (who principal))
  (is-eq who (var-get admin))
)

;; Public: change admin address (admin-only)
(define-public (set-admin (new-admin principal))
  (if (not (is-admin tx-sender))
      ERR-NOT-AUTHORIZED
      (begin
        (var-set admin new-admin)
        (ok new-admin)
      )))

;; Internal helper to insert a new receipt with given owner (fee first)
(define-private (insert-receipt (text (string-utf8 160)) (owner principal))
  (let (
        (new-id (+ (var-get last-id) u1))
        (now    stacks-block-time)
       )
    (begin
      ;; fee must succeed before any state change
      (try! (stx-transfer? (var-get STAMP-FEE) tx-sender TREASURY))
      (var-set last-id new-id)
      (map-insert receipts
        { id: new-id }
        {
          creator: tx-sender,
          owner: owner,
          royalty-recipient: tx-sender,
          text: text,
          created-at: now
        })
      (print
        {
          kind: "receipt-submitted",
          id: new-id,
          creator: tx-sender,
          owner: owner,
          royalty-recipient: tx-sender,
          created-at: now
        })
      (ok new-id)
    )))

;; Public: self-stamp (creator = tx-sender, owner = tx-sender)
(define-public (submit-receipt (text (string-utf8 160)))
  (insert-receipt text tx-sender))

;; Public: stamp for another principal (creator = tx-sender, owner = recipient)
(define-public (submit-receipt-for (text (string-utf8 160)) (recipient principal))
  (insert-receipt text recipient))

;; Public: transfer ownership to a new owner; creator stays unchanged; pays royalty first
(define-public (transfer-receipt (id uint) (new-owner principal))
  (let ((entry (map-get? receipts { id: id })))
    (if (is-none entry)
        ERR-NOT-FOUND
        (let (
              (receipt (unwrap! entry ERR-NOT-FOUND))
              (current-owner (get owner receipt))
              (royalty-to (get royalty-recipient receipt))
             )
          (if (not (is-eq tx-sender current-owner))
              ERR-NOT-OWNER
              (begin
                ;; royalty must succeed before state change
                (try! (stx-transfer? (var-get ROYALTY-FEE) tx-sender royalty-to))
                (map-set receipts { id: id }
                  {
                    creator: (get creator receipt),
                    owner: new-owner,
                    royalty-recipient: royalty-to,
                    text: (get text receipt),
                    created-at: (get created-at receipt)
                  })
                (print
                  {
                    kind: "receipt-transferred",
                    id: id,
                    from: current-owner,
                    to: new-owner,
                    royalty-to: royalty-to
                  })
                (ok id)
              ))))))

;; Public: creator-only change of royalty recipient for a receipt
(define-public (set-receipt-royalty-recipient (id uint) (new-recipient principal))
  (let ((entry (map-get? receipts { id: id })))
    (if (is-none entry)
        ERR-NOT-FOUND
        (let ((receipt (unwrap! entry ERR-NOT-FOUND)))
          (if (not (is-eq tx-sender (get creator receipt)))
              ERR-NOT-CREATOR
              (begin
                (map-set receipts { id: id }
                  {
                    creator: (get creator receipt),
                    owner: (get owner receipt),
                    royalty-recipient: new-recipient,
                    text: (get text receipt),
                    created-at: (get created-at receipt)
                  })
                (print
                  {
                    kind: "receipt-royalty-updated",
                    id: id,
                    creator: (get creator receipt),
                    new-recipient: new-recipient
                  })
                (ok id)
              ))))))

;; Public: admin-only update of fees
(define-public (set-fees (new-stamp-fee uint) (new-royalty-fee uint))
  (if (not (is-admin tx-sender))
      ERR-NOT-AUTHORIZED
      (begin
        (var-set STAMP-FEE new-stamp-fee)
        (var-set ROYALTY-FEE new-royalty-fee)
        (ok
          {
            stamp-fee: (var-get STAMP-FEE),
            royalty-fee: (var-get ROYALTY-FEE)
          })
      )))

;; Read-only helper: get a receipt by id
(define-read-only (get-receipt (id uint))
  (map-get? receipts { id: id }))

;; Read-only helper: get the current last-id
(define-read-only (get-last-id)
  (ok (var-get last-id)))
