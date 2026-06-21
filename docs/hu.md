# User Stories

# Epic 1: Users and Authentication

## US-1 User Registration

As a user, I want to register with basic details so I can use the platform.
**Acceptance Criteria:**

- Registration with name, username, and address.
- Account creation in database.
- Default role assignment.

## US-2 Login

As a user, I want to log in so I can access my orders and tickets.
**Acceptance Criteria:**

- Functional login.
- Persistent session.
- Logout available.

## US-3 Role Management

As an administrator, I want to assign roles to users to control permissions.
**Available Roles:**

- admin
- support
- designer

---

# Epic 2: Products

## US-4 View Product Catalog

As a user, I want to browse available products to choose what to buy.
**Acceptance Criteria:**

- Product listing.
- Product detail view.

## US-5 Customize Product

As a user, I want to customize products to suit my needs.
**Options:**

- Text
- Image
- Color
- Size

---

# Epic 3: Orders

## US-6 Create Order

As a user, I want to create an order to buy customized products.
**Acceptance Criteria:**

- Order created from cart.
- Includes customization details.
- Initial status defined.

---

# Epic 4: Payments

## US-7 PayPal Payment

As a user, I want to pay with PayPal to complete my purchase.
**Acceptance Criteria:**

- Functional PayPal integration.
- Payment confirmation.
- Order status update.

---

# Epic 5: Tickets and Support

## US-8 Create Ticket Manually

As a user, I want to create tickets to request help.
**Acceptance Criteria:**

- Ticket created manually.
- Optional association with an order.

## US-9 Ticket Chat

As a user, I want to chat within the ticket to resolve issues.
**Acceptance Criteria:**

- Persistent messages.
- Associated with a ticket.

## US-10 AI Assistant

As a user or support agent, I want AI suggestions to respond faster.
**Acceptance Criteria:**

- AI suggests responses.
- No automated business actions.

---

# Summary

This backlog defines:

- Architecture decoupled by events.
- AI as an assistant.
- Ticket-based chat with polling.
- Multi-vendor ready system.
