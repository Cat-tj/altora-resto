# Altora Resto — Product, Domain, Database, API & UX Implementation Blueprint

Dokumen arsitektur lengkap dari konsultasi. Sumber kebenaran untuk semua implementasi.

## Implementation Sequence

### Phase 0 — Domain Foundation (P0)
- [ ] Tenant/outlet context + authorization
- [ ] Permission model (granular)
- [ ] AuditEvent (append-only)
- [ ] Idempotency key system
- [ ] Money utilities (integer minor units, rounding)
- [ ] BusinessDate (cutoff timezone-aware)

### Phase 1 — Orders & Payments (P0)
- [ ] Order, OrderItem, Check, CheckAllocation, Payment
- [ ] Split bill (by item, by seat, equal, custom)
- [ ] Void/Refund with audit
- [ ] Shift management (open/close/cash drawer)

### Phase 2 — Kitchen (P0)
- [ ] Kitchen tickets + station routing
- [ ] Item status lifecycle
- [ ] Course management + fire
- [ ] Expo board
- [ ] Void routing to KDS

### Phase 3 — Recipe + Inventory (P0.5)
- [ ] Recipe versioning
- [ ] Ingredient units + conversion
- [ ] Stock ledger (immutable movements)
- [ ] Auto consumption on production completion
- [ ] Waste, stock count, transfer

### Phase 4 — Promotion Engine (P1)
- [ ] Conditions + benefits (JSON config)
- [ ] Priority + stacking rules
- [ ] Discount allocation to items
- [ ] Usage ledger

### Phase 5 — Loyalty (P1)
- [ ] Account, ledger, grants
- [ ] Earn, redeem, expiry (earliest-first)
- [ ] Tier recalculation
- [ ] Refund reversal

### Phase 6 — Reservation + Table (P1)
- [ ] Availability search
- [ ] Table assignment with concurrency guard
- [ ] Waitlist
- [ ] No-show tracking

### Phase 7 — Employee + Attendance (P1)
- [ ] Schedule, clock in/out, break
- [ ] Correction + approval workflow

### Phase 8 — Reports (P1)
- [ ] Built from production-grade ledgers
