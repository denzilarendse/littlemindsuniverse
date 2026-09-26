# LittleMindsUniverse PayFast Production-Layer Evidence — 27 September 2026

## Scope

This record separates the payment layers that are already verified from the external PayFast merchant/account gate that is still open.

No real charge was created by these checks. Live database payment mutations were executed inside rollback-only transactions and used synthetic PayFast identifiers that were verified absent after rollback.

## Existing application controls

The production checkout API authenticates the caller, validates the requested self-service plan, derives the canonical quote and order server-side, fetches reference FX rates server-side, signs the PayFast fields server-side and never accepts a client-supplied authoritative settlement amount.

The ITN handler requires:

- the configured merchant ID;
- a valid PayFast signature;
- source-address verification when required by configuration;
- PayFast server-to-server validation;
- a UUID payment order ID;
- a positive `amount_gross`;
- a PayFast payment identifier;
- database finalization only after those checks.

Payment database RPCs (`create_payment_quote`, `create_payment_order_from_quote`, `finalize_payfast_payment`, `record_payfast_event`) are executable by `service_role` but not by `anon` or `authenticated`.

A live authenticated parent-role attempt to call `create_payment_quote` directly was rejected with `permission denied for function create_payment_quote`, confirming that browser clients cannot bypass the server checkout handler and forge authoritative quotes directly.

## Active production plans observed

The live billing-plan state used by the rollback test contains:

- family monthly: USD 3 standard price with a one-time USD 1 introductory price;
- family annual: USD 30;
- school 500+: USD 1 per seat/month, minimum 500 seats, not self-service.

## Live rollback-only settlement test

A live service-role transaction exercised the database payment path for a linked parent/learner family monthly checkout using fixed synthetic FX input only for deterministic database verification.

Within the transaction:

1. `create_payment_quote` created a family monthly quote;
2. `create_payment_order_from_quote` created the authoritative order;
3. the order selected the introductory pricing phase for the tested eligible profile;
4. `finalize_payfast_payment` received a synthetic COMPLETE PayFast result with the exact authoritative order amount;
5. the payment order moved to `paid`;
6. an active entitlement linked to that payment order was created.

Observed transaction result:

- order status: `paid`;
- pricing phase: `intro`;
- deterministic settlement amount at the test FX rate: ZAR 17.50;
- entitlement created: `true`.

The transaction was rolled back. Follow-up checks found zero payment orders, quotes or entitlements carrying the synthetic E2E identifiers.

## Negative amount-integrity test

A second rollback-only live transaction created a quote/order and attempted to finalize it with an amount one rand greater than the authoritative order amount.

`finalize_payfast_payment` rejected the request with:

`Payment amount mismatch.`

Follow-up checks confirmed zero persisted quotes, orders or entitlements from the negative test.

This confirms that the live database settlement boundary rejects an amount mismatch rather than granting entitlement.

## Automated provider-protocol coverage already present

The repository test suite additionally covers the PayFast protocol layer, including signature tampering, verified sandbox-style ITN finalization flow, provider-validation rejection, raw Netlify ITN body preservation, and the rule that public checkout cannot open a non-self-service school plan.

These automated checks remain distinct from a real PayFast merchant sandbox/live transaction.

## Current external blocker

The production health endpoint currently reports `payfastConfigured=false`, because the required PayFast merchant environment configuration is not present on the production Netlify functions runtime.

Therefore the following are **not yet claimed**:

- a real PayFast-hosted checkout from the production LMU site;
- a PayFast server-to-server ITN received by the production Netlify endpoint;
- provider validation against the real merchant account;
- a provider-backed entitlement settlement;
- a real refund/cancellation/reconciliation exercise.

The production payment gate remains **OPEN / OWNER-PROVIDER DEPENDENT** until the merchant account is fully verified, the server-only PayFast configuration is installed in Netlify without exposing secrets, and a provider-backed transaction is successfully observed end-to-end.

No PayFast merchant key, passphrase or other secret should be committed to GitHub or pasted into release evidence.
