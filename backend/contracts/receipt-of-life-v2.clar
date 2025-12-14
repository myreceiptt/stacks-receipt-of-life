;; Stacks Receipt of Life v2.0.0 (skeleton, same behavior as v1.2.34)
;; Clarity 4 contract
;; STAMP-FEE is paid to TREASURY on submit (submit-receipt / submit-receipt-for).
;; ROYALTY-FEE is paid to the current royalty-recipient on transfer-receipt.

(define-constant VERSION-MAJOR u2)
(define-constant VERSION-MINOR u0)
(define-constant VERSION-PATCH u0)

(define-constant MAX-PAGE-SIZE u10)

(define-constant TREASURY 'SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH)

;; contract owner and mutable admin
(define-constant CONTRACT-OWNER 'SP29ECHHQ6F9344SGGGRGDPTPFPTXA3GHXK28KCWH)
;; Mutable admin; default = contract deployer (in this case, same as CONTRACT-OWNER)
(define-data-var admin principal CONTRACT-OWNER)

;; Fees (mutable)
(define-data-var STAMP-FEE uint u1000)
(define-data-var ROYALTY-FEE uint u500)

;; Stats
(define-data-var total-submissions uint u0)
(define-data-var total-transfers uint u0)
(define-data-var total-stamp-fee uint u0)
(define-data-var total-royalty-fee uint u0)

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
      (var-set total-submissions (+ (var-get total-submissions) u1))
      (var-set total-stamp-fee (+ (var-get total-stamp-fee) (var-get STAMP-FEE)))
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
                (var-set total-transfers (+ (var-get total-transfers) u1))
                (var-set total-royalty-fee (+ (var-get total-royalty-fee) (var-get ROYALTY-FEE)))
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

;; Internal helper: collect receipt into list if present
(define-private (collect-receipt
  (id uint)
  (acc (list 10 (tuple
                  (id uint)
                  (creator principal)
                  (owner principal)
                  (royalty-recipient principal)
                  (text (string-utf8 160))
                  (created-at uint)))))
  (let ((entry (map-get? receipts { id: id })))
    (if (is-none entry)
        acc
        (let ((receipt (unwrap-panic entry)))
          (if (>= (len acc) MAX-PAGE-SIZE)
              acc
              (match
                (as-max-len?
                  (append acc {
                    id: id,
                    creator: (get creator receipt),
                    owner: (get owner receipt),
                    royalty-recipient: (get royalty-recipient receipt),
                    text: (get text receipt),
                    created-at: (get created-at receipt)
                  })
                  u10)
                result
                result
                acc))))))

;; Read-only: paged receipts scan
(define-read-only (get-receipts-range (start-id uint) (limit uint))
  (let ((last (var-get last-id)))
    (if (or (is-eq last u0) (is-eq start-id u0) (> start-id last))
        (ok (list))
        (let (
              (effective-limit (if (< limit MAX-PAGE-SIZE) limit MAX-PAGE-SIZE))
             )
          (let (
                (list0 (unwrap-panic (as-max-len? (list) u10)))
                (list1 (if (and (> effective-limit u0) (<= start-id last))
                           (collect-receipt start-id list0)
                           list0))
                (id2 (+ start-id u1))
                (list2 (if (and (> effective-limit u1) (<= id2 last))
                           (collect-receipt id2 list1)
                           list1))
                (id3 (+ start-id u2))
                (list3 (if (and (> effective-limit u2) (<= id3 last))
                           (collect-receipt id3 list2)
                           list2))
                (id4 (+ start-id u3))
                (list4 (if (and (> effective-limit u3) (<= id4 last))
                           (collect-receipt id4 list3)
                           list3))
                (id5 (+ start-id u4))
                (list5 (if (and (> effective-limit u4) (<= id5 last))
                           (collect-receipt id5 list4)
                           list4))
                (id6 (+ start-id u5))
                (list6 (if (and (> effective-limit u5) (<= id6 last))
                           (collect-receipt id6 list5)
                           list5))
                (id7 (+ start-id u6))
                (list7 (if (and (> effective-limit u6) (<= id7 last))
                           (collect-receipt id7 list6)
                           list6))
                (id8 (+ start-id u7))
                (list8 (if (and (> effective-limit u7) (<= id8 last))
                           (collect-receipt id8 list7)
                           list7))
                (id9 (+ start-id u8))
                (list9 (if (and (> effective-limit u8) (<= id9 last))
                           (collect-receipt id9 list8)
                           list8))
                (id10 (+ start-id u9))
                (list10 (if (and (> effective-limit u9) (<= id10 last))
                            (collect-receipt id10 list9)
                            list9))
               )
            (ok list10))))))

;; Read-only: contract version
(define-read-only (get-version)
  (ok
    {
      major: VERSION-MAJOR,
      minor: VERSION-MINOR,
      patch: VERSION-PATCH
    }))

;; Read-only: config snapshot
(define-read-only (get-config)
  (ok
    {
      contract-owner: CONTRACT-OWNER,
      treasury: TREASURY,
      admin: (var-get admin),
      stamp-fee: (var-get STAMP-FEE),
      royalty-fee: (var-get ROYALTY-FEE),
      last-id: (var-get last-id),
      version-major: VERSION-MAJOR,
      version-minor: VERSION-MINOR,
      version-patch: VERSION-PATCH
    }))

(define-read-only (get-stats)
  (ok
    {
      major: VERSION-MAJOR,
      minor: VERSION-MINOR,
      patch: VERSION-PATCH,
      last-id: (var-get last-id),
      total-submissions: (var-get total-submissions),
      total-transfers: (var-get total-transfers),
      total-stamp-fee: (var-get total-stamp-fee),
      total-royalty-fee: (var-get total-royalty-fee)
    }))

(define-private (add-if-owner
  (id uint)
  (target principal)
  (acc (list 10 (tuple
                  (id uint)
                  (creator principal)
                  (owner principal)
                  (royalty-recipient principal)
                  (text (string-utf8 160))
                  (created-at uint)))))
  (match (map-get? receipts { id: id })
    receipt (if (and (< (len acc) MAX-PAGE-SIZE) (is-eq target (get owner receipt)))
                (match
                  (as-max-len?
                    (append acc {
                      id: id,
                      creator: (get creator receipt),
                      owner: (get owner receipt),
                      royalty-recipient: (get royalty-recipient receipt),
                      text: (get text receipt),
                      created-at: (get created-at receipt)
                    })
                    u10)
                  result result
                  acc)
                acc)
    acc))

(define-private (add-if-creator
  (id uint)
  (target principal)
  (acc (list 10 (tuple
                  (id uint)
                  (creator principal)
                  (owner principal)
                  (royalty-recipient principal)
                  (text (string-utf8 160))
                  (created-at uint)))))
  (match (map-get? receipts { id: id })
    receipt (if (and (< (len acc) MAX-PAGE-SIZE) (is-eq target (get creator receipt)))
                (match
                  (as-max-len?
                    (append acc {
                      id: id,
                      creator: (get creator receipt),
                      owner: (get owner receipt),
                      royalty-recipient: (get royalty-recipient receipt),
                      text: (get text receipt),
                      created-at: (get created-at receipt)
                    })
                    u10)
                  result result
                  acc)
                acc)
    acc))

(define-private (add-if-royalty
  (id uint)
  (target principal)
  (acc (list 10 (tuple
                  (id uint)
                  (creator principal)
                  (owner principal)
                  (royalty-recipient principal)
                  (text (string-utf8 160))
                  (created-at uint)))))
  (match (map-get? receipts { id: id })
    receipt (if (and (< (len acc) MAX-PAGE-SIZE) (is-eq target (get royalty-recipient receipt)))
                (match
                  (as-max-len?
                    (append acc {
                      id: id,
                      creator: (get creator receipt),
                      owner: (get owner receipt),
                      royalty-recipient: (get royalty-recipient receipt),
                      text: (get text receipt),
                      created-at: (get created-at receipt)
                    })
                    u10)
                  result result
                  acc)
                acc)
    acc))

(define-read-only (get-receipts-by-owner (owner principal) (start-id uint) (limit uint))
  (let (
        (last (var-get last-id))
        (normalized-start (if (is-eq start-id u0) u1 start-id))
       )
    (if (or (is-eq limit u0) (is-eq last u0) (> normalized-start last))
        (ok (list))
        (let (
              (effective-limit (if (< limit MAX-PAGE-SIZE) limit MAX-PAGE-SIZE))
              (list0 (unwrap-panic (as-max-len? (list) u10)))
              (list1 (if (and (> effective-limit u0) (<= normalized-start last))
                         (add-if-owner normalized-start owner list0)
                         list0))
              (id2 (+ normalized-start u1))
              (list2 (if (and (> effective-limit u1) (<= id2 last))
                         (add-if-owner id2 owner list1)
                         list1))
              (id3 (+ normalized-start u2))
              (list3 (if (and (> effective-limit u2) (<= id3 last))
                         (add-if-owner id3 owner list2)
                         list2))
              (id4 (+ normalized-start u3))
              (list4 (if (and (> effective-limit u3) (<= id4 last))
                         (add-if-owner id4 owner list3)
                         list3))
              (id5 (+ normalized-start u4))
              (list5 (if (and (> effective-limit u4) (<= id5 last))
                         (add-if-owner id5 owner list4)
                         list4))
              (id6 (+ normalized-start u5))
              (list6 (if (and (> effective-limit u5) (<= id6 last))
                         (add-if-owner id6 owner list5)
                         list5))
              (id7 (+ normalized-start u6))
              (list7 (if (and (> effective-limit u6) (<= id7 last))
                         (add-if-owner id7 owner list6)
                         list6))
              (id8 (+ normalized-start u7))
              (list8 (if (and (> effective-limit u7) (<= id8 last))
                         (add-if-owner id8 owner list7)
                         list7))
              (id9 (+ normalized-start u8))
              (list9 (if (and (> effective-limit u8) (<= id9 last))
                         (add-if-owner id9 owner list8)
                         list8))
              (id10 (+ normalized-start u9))
              (list10 (if (and (> effective-limit u9) (<= id10 last))
                          (add-if-owner id10 owner list9)
                          list9))
             )
          (ok list10)))))

(define-read-only (get-receipts-by-creator (creator principal) (start-id uint) (limit uint))
  (let (
        (last (var-get last-id))
        (normalized-start (if (is-eq start-id u0) u1 start-id))
       )
    (if (or (is-eq limit u0) (is-eq last u0) (> normalized-start last))
        (ok (list))
        (let (
              (effective-limit (if (< limit MAX-PAGE-SIZE) limit MAX-PAGE-SIZE))
              (list0 (unwrap-panic (as-max-len? (list) u10)))
              (list1 (if (and (> effective-limit u0) (<= normalized-start last))
                         (add-if-creator normalized-start creator list0)
                         list0))
              (id2 (+ normalized-start u1))
              (list2 (if (and (> effective-limit u1) (<= id2 last))
                         (add-if-creator id2 creator list1)
                         list1))
              (id3 (+ normalized-start u2))
              (list3 (if (and (> effective-limit u2) (<= id3 last))
                         (add-if-creator id3 creator list2)
                         list2))
              (id4 (+ normalized-start u3))
              (list4 (if (and (> effective-limit u3) (<= id4 last))
                         (add-if-creator id4 creator list3)
                         list3))
              (id5 (+ normalized-start u4))
              (list5 (if (and (> effective-limit u4) (<= id5 last))
                         (add-if-creator id5 creator list4)
                         list4))
              (id6 (+ normalized-start u5))
              (list6 (if (and (> effective-limit u5) (<= id6 last))
                         (add-if-creator id6 creator list5)
                         list5))
              (id7 (+ normalized-start u6))
              (list7 (if (and (> effective-limit u6) (<= id7 last))
                         (add-if-creator id7 creator list6)
                         list6))
              (id8 (+ normalized-start u7))
              (list8 (if (and (> effective-limit u7) (<= id8 last))
                         (add-if-creator id8 creator list7)
                         list7))
              (id9 (+ normalized-start u8))
              (list9 (if (and (> effective-limit u8) (<= id9 last))
                         (add-if-creator id9 creator list8)
                         list8))
              (id10 (+ normalized-start u9))
              (list10 (if (and (> effective-limit u9) (<= id10 last))
                          (add-if-creator id10 creator list9)
                          list9))
             )
          (ok list10)))))

(define-read-only (get-receipts-by-royalty-recipient (recipient principal) (start-id uint) (limit uint))
  (let (
        (last (var-get last-id))
        (normalized-start (if (is-eq start-id u0) u1 start-id))
       )
    (if (or (is-eq limit u0) (is-eq last u0) (> normalized-start last))
        (ok (list))
        (let (
              (effective-limit (if (< limit MAX-PAGE-SIZE) limit MAX-PAGE-SIZE))
              (list0 (unwrap-panic (as-max-len? (list) u10)))
              (list1 (if (and (> effective-limit u0) (<= normalized-start last))
                         (add-if-royalty normalized-start recipient list0)
                         list0))
              (id2 (+ normalized-start u1))
              (list2 (if (and (> effective-limit u1) (<= id2 last))
                         (add-if-royalty id2 recipient list1)
                         list1))
              (id3 (+ normalized-start u2))
              (list3 (if (and (> effective-limit u2) (<= id3 last))
                         (add-if-royalty id3 recipient list2)
                         list2))
              (id4 (+ normalized-start u3))
              (list4 (if (and (> effective-limit u3) (<= id4 last))
                         (add-if-royalty id4 recipient list3)
                         list3))
              (id5 (+ normalized-start u4))
              (list5 (if (and (> effective-limit u4) (<= id5 last))
                         (add-if-royalty id5 recipient list4)
                         list4))
              (id6 (+ normalized-start u5))
              (list6 (if (and (> effective-limit u5) (<= id6 last))
                         (add-if-royalty id6 recipient list5)
                         list5))
              (id7 (+ normalized-start u6))
              (list7 (if (and (> effective-limit u6) (<= id7 last))
                         (add-if-royalty id7 recipient list6)
                         list6))
              (id8 (+ normalized-start u7))
              (list8 (if (and (> effective-limit u7) (<= id8 last))
                         (add-if-royalty id8 recipient list7)
                         list7))
              (id9 (+ normalized-start u8))
              (list9 (if (and (> effective-limit u8) (<= id9 last))
                         (add-if-royalty id9 recipient list8)
                         list8))
              (id10 (+ normalized-start u9))
              (list10 (if (and (> effective-limit u9) (<= id10 last))
                          (add-if-royalty id10 recipient list9)
                          list9))
             )
          (ok list10)))))
