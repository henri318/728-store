# Gentle AI 4R Review Policy

## Purpose

Review the current change using the four Gentle AI review lenses:

1. Risk
2. Readability
3. Reliability
4. Resilience

Review only the current diff and the minimum surrounding context required to understand it.

Do not modify files during the review.

Prioritize demonstrable defects over subjective preferences. Every finding must explain the concrete impact and reference the relevant file and approximate line.

---

# R1 — Risk

Evaluate security, authorization, privacy, dependency, and architectural risks.

## Security

Check for:

- Missing authentication or authorization.
- Missing ownership checks.
- Privilege escalation.
- Exposure of personal, private, or sensitive data.
- Secrets, credentials, tokens, API keys, or internal identifiers exposed to clients.
- SQL injection, XSS, CSRF, SSRF, open redirects, path traversal, or unsafe file handling.
- Unvalidated input at HTTP, webhook, form, upload, queue, and persistence boundaries.
- Information leakage through errors or logs.
- Unsafe handling of cookies, sessions, reset tokens, verification tokens, or OAuth data.
- Webhook processing without signature verification or idempotency.
- Dependencies or configuration changes that increase the attack surface.

## E-commerce risks

Check especially:

- Prices or totals accepted from the client.
- Product, seller, customization, order, or payment identifiers used without validation.
- Users accessing another user's cart, order, upload, or customization.
- Sellers accessing products or orders belonging to another seller.
- Payment state changed without verified provider evidence.
- Duplicate payment, order, refund, or webhook processing.
- Public access to private Cloudflare R2 objects.
- Uploads accepted without size, type, ownership, or content validation.

## Architecture risks

Check for:

- Prisma or infrastructure adapters instantiated directly from routes, pages, or components.
- Infrastructure dependencies imported into domain code.
- Direct imports between modules that bypass contracts, ports, or events.
- Business rules implemented only in presentation code.
- Authorization enforced only in the UI.
- Transactions missing where multiple writes must succeed atomically.

## Severity

Use Critical or High when the issue can cause:

- Unauthorized access.
- Account compromise.
- Data leakage.
- Incorrect payment processing.
- Irrecoverable data corruption.
- Cross-user or cross-seller access.

---

# R2 — Readability

Evaluate whether the implementation communicates its intent clearly and remains maintainable.

## Clarity

Check for:

- Names that do not express domain intent.
- Functions or classes with multiple unrelated responsibilities.
- Deep nesting or complex branching.
- Boolean parameters whose meaning is unclear at the call site.
- Hidden side effects.
- Important invariants that are not visible in types or domain objects.
- Duplicated rules that may diverge.
- Comments that repeat the code instead of explaining intent or constraints.
- Error handling that hides the original operation or context.

## Project structure

Verify that the code remains separated into:

- Domain.
- Application.
- Infrastructure.
- Presentation.
- Public contracts.
- Shared kernel primitives.

Check that:

- Use cases orchestrate application behavior.
- Entities and value objects enforce domain invariants.
- Repositories and external services are accessed through ports.
- React components do not contain persistence or domain orchestration logic.
- Route handlers remain thin.
- Cross-module communication uses contracts, ports, or domain/integration events.

## Scope and reviewability

Flag:

- Unrelated changes mixed into the same diff.
- Large mechanical refactors combined with behavioral changes.
- Dead code left after a migration.
- Temporary compatibility branches without a removal strategy.
- Abstractions that add indirection without reducing duplication or coupling.

Do not report purely stylistic preferences unless they materially affect comprehension or maintenance.

---

# R3 — Reliability

Evaluate whether the implementation behaves correctly and is supported by valuable verification.

## Correctness

Check for:

- Incorrect business rules.
- Invalid state transitions.
- Off-by-one errors.
- Incorrect null, empty, zero, or negative-value handling.
- Time-zone or date-boundary problems.
- Floating-point arithmetic used for money.
- Incorrect quantity, stock, price, discount, or total calculations.
- Race conditions.
- Partial writes.
- Stale data assumptions.
- Incorrect cache invalidation.
- Missing awaits or unhandled asynchronous failures.

## Contracts and invariants

Verify:

- DTOs are validated at system boundaries.
- Domain invariants cannot be bypassed through alternative entry points.
- Repository implementations respect their domain contracts.
- Value objects reject invalid states.
- Events contain enough information for their consumers.
- API responses and errors preserve documented behavior.
- Database constraints agree with domain constraints.
- Optional fields have explicit semantics.

## Tests

Require tests for new or changed behavior.

Check that tests:

- Assert observable behavior rather than implementation details.
- Include invalid inputs and relevant edge cases.
- Reproduce fixed regressions.
- Cover authorization and ownership boundaries.
- Cover failure paths, not only successful paths.
- Remain deterministic.
- Do not rely unnecessarily on execution order, real time, or external services.
- Fail for the intended reason before the fix.
- Validate interactions with ports when those interactions are part of the use-case contract.

Flag tests that pass without exercising the changed behavior.

## E-commerce reliability

Check especially:

- Cart totals are recalculated on the trusted side.
- Product price changes are handled intentionally during checkout.
- Orders preserve the purchased price snapshot.
- Payment amount and currency match the order.
- Webhooks are idempotent.
- Stock or availability is checked at the correct stage.
- Seller boundaries are maintained when grouping or fulfilling order items.
- Customization data remains associated with the correct order line.

---

# R4 — Resilience

Evaluate behavior under partial failure, retries, latency, concurrency, and external-service outages.

## Failure handling

Check for:

- External failures treated as successful operations.
- Errors swallowed without reporting or compensation.
- Missing timeout or cancellation handling.
- Retry logic applied to non-idempotent operations.
- Retries without limits or backoff.
- Operations that become duplicated after a retry.
- Partial state left after an exception.
- Failed jobs or events with no recovery path.
- Components that assume external services are always available.

## External integrations

Review integrations with:

- PayPal or other payment providers.
- Brevo.
- Cloudflare R2.
- Neon/PostgreSQL.
- Google authentication.
- Queues, webhooks, background jobs, and third-party APIs.

Verify:

- Timeouts are bounded.
- Retry behavior is explicit.
- Idempotency keys or deduplication exist where required.
- Failures are observable.
- User-facing messages do not expose internal details.
- Temporary failures can be distinguished from permanent failures.
- A failed secondary operation does not silently corrupt the primary operation.

## Data consistency

Check for:

- Multiple related database writes without a transaction.
- Events emitted before the transaction commits.
- Database state updated before an external operation whose failure cannot be compensated.
- Outbox events that can be lost or emitted twice without safe handling.
- Consumers that are not idempotent.
- Concurrent updates that overwrite newer state.
- Missing optimistic concurrency or uniqueness guarantees where required.

## Operability

Verify that important failures provide enough context through:

- Structured logs.
- Correlation identifiers.
- Order, payment, user, seller, or job identifiers.
- Actionable error classification.
- Metrics or audit records for critical state transitions.

Do not require excessive logging of routine operations or sensitive information.

---

# Finding requirements

Every reported finding must contain:

- `Lens`: Risk, Readability, Reliability, or Resilience.
- `Severity`: Critical, High, Medium, or Low.
- `Location`: file and approximate line.
- `Problem`: what is wrong.
- `Impact`: the concrete consequence.
- `Evidence`: why the current code permits the problem.
- `Recommendation`: the smallest safe correction.

Use stable identifiers:

- `RISK-001`
- `READ-001`
- `RELI-001`
- `RESI-001`

Do not report a finding when:

- It is only a personal style preference.
- The problematic behavior cannot occur.
- Existing validation or constraints already prevent it.
- It is unrelated to the reviewed diff.
- It requires speculative future requirements.

When uncertain, label the finding as requiring verification and explain what evidence is missing.

---

# Review completion criteria

The review is complete when:

- All four lenses have been evaluated.
- Critical and High findings are clearly separated from advisory findings.
- Duplicate findings across lenses have been consolidated.
- Existing protections have been considered before reporting an issue.
- The final result states whether the change is ready to merge.

Final decision:

- `PASS`: no blocking findings.
- `PASS WITH ADVISORIES`: only non-blocking findings.
- `CHANGES REQUIRED`: one or more blocking findings.
- `BLOCK`: critical security, data-integrity, or payment risk.
