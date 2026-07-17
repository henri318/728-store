# Event Catalog

# Overview

Complete list of domain events used for cross-module communication.

---

# Customizations

- **ProductCustomizationCreated**: Triggered when a user creates a new customization.

# Orders

- **OrderCreated**: Triggered when a new order is placed.
- **OrderPaid**: Triggered when payment is verified.
- **OrderReadyForProduction**: Triggered when an order is moved to production.

# Payments

- **PaymentInitialized**: Triggered when a payment session starts.
- **PaymentVerified**: Triggered after provider webhook verification.
- **PaymentCompleted**: Triggered when the payment flow finishes successfully.

# AI

- **AISuggestionRequested**: Triggered when the system needs an AI response.
- **AISuggestionGenerated**: Triggered when the AI provides a suggestion.

# Uploads

- **UploadStored**: Triggered when a file is successfully uploaded to Cloudinary.

# Sellers

- **SellerCreated**: Triggered when a new seller entity is created.

# Users

- **UserRegistered**: Triggered when a new user joins.
- **RoleAssigned**: Triggered when a role is assigned or changed.
