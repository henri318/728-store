## Reglas del proyecto

# Agent Rules

# Overview

This document defines the mandatory rules and constraints for the AI agent working on the Next.js Modular E-commerce platform.

---

# Core Principles

1. **Modular Monolith**: Maintain strict separation between modules.
2. **Event-Driven**: All cross-module communication must use the internal event bus.
3. **Domain-First**: Business logic stays in the domain layer.
4. **Multi-vendor Ready**: `sellerId` is mandatory for all primary entities.
5. **Neutral Locale**: The `es` locale is considered neutral.

---

# Development Workflow (MANDATORY)

1. **Strict TDD Mode**: Always write tests BEFORE implementing business logic.
   - Include edge cases (empty states, invalid inputs, error conditions).
   - Use Fakes/Mocks for infrastructure dependencies.
2. **Verification**:
   - All tests MUST pass after any development or refactor (`npm test`).
   - Use the **Chrome DevTools MCP** to verify that the UI renders correctly and handles user interactions as expected.
3. **Code Modification**: When editing code, focus on modifying only the erroneous or necessary parts. Avoid rewriting entire files if the change is localized and the rest of the code is correct. If a small code section needs modification, address only that section.

---

# Strict Prohibitions

- DO NOT import logic directly between modules.
- DO NOT share domain logic across modules.
- DO NOT couple payments, AI, or tickets directly to orders.
- DO NOT execute business logic in the infrastructure layer.
- AI MUST NOT take autonomous business decisions (suggestions only).
- **No commits or PRs without explicit permission**: never run git commit, git push, or create PRs unless the user explicitly requests it. Changes must remain in the staging area/working tree until the user decides otherwise.
- **Never auto-complete PRs**: always stop and ASK before merging. Never merge PRs automatically, even if all checks pass. The user must explicitly approve every merge.

---

# Mandatory Requirements

- **One class per file**: Each file must contain exactly one primary export (class, interface, or function). No multiple classes in a single file. Barrel exports (`index.ts`) are the exception — they re-export only.
- Every module must have a clear `domain`, `application`, `infrastructure`, and `presentation` structure.
- Communication between modules ONLY via:
  - Domain Events.
  - Interfaces (Ports/Adapters).
- Tickets must be created manually by users.
- Chat system uses polling (No WebSockets).
- Payments must be decoupled via the Adapter pattern.

---

# Reference Documentation

- Architecture: `docs/architecture.md`
- Folder Structure: `docs/folder-structure.md`
- Event Bus: `docs/event-bus.md`
- Entity Model: `docs/entities.md`
- Modules: See `docs/module-*.md`
