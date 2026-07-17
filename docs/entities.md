# Entity Model

# Overview

This model defines the main domain entities of the system.
Designed for:

- Modular monolith (DDD-lite)
- Event-driven communication
- Multi-vendor ready (mandatory seller)
- Decoupled AI
- Independent payments

---

# User

Represents a system user.

## Fields

- id
- email
- username
- name
- passwordHash
- address
- roleId
- createdAt
- updatedAt

## Relations

- role
- orders
- uploads

---

# Role

Defines user permissions.

## Fields

- id
- name (admin | support | designer | user)

## Relations

- users

---

# Seller

Base business entity.

## Fields

- id
- name
- createdAt

## Relations

- products
- orders

## Note

- Mandatory across the system.
- Currently, only 1 seller exists.

---

# Product

Sellable product.

## Fields

- id
- name
- description
- basePrice
- sellerId
- createdAt

## Relations

- seller
- orderItems

---

# Customization

Customization options owned by the customizations module.

## Fields

- id
- text
- color
- size
- imageUrl
- productId
- createdAt

## Relations

- product
- orderItems

---

# Order

User's order.

## Fields

- id
- status (pending | paid | production | shipped)
- total
- userId
- sellerId
- createdAt

## Relations

- user
- seller
- items
- payment

---

# OrderItem

Item within an order.

## Fields

- id
- quantity
- price
- orderId
- productId
- customizationId

## Relations

- order
- product
- customization

---

# Payment

Order payment.

## Fields

- id
- provider (paypal)
- status (pending | completed | failed)
- amount
- currency
- orderId
- providerRef
- createdAt

## Relations

- order

---

# AIInteraction

AI interaction history.

## Fields

- id
- prompt
- response
- userId (optional)
- createdAt

## Relations

---

# Upload

User uploaded files.

## Fields

- id
- url
- type (product | avatar | customization | general)
- userId
- createdAt

## Relations

- user

---

# Cart

Represents a user's shopping cart. A user has at most one ACTIVE cart at a time.

## Fields

- id
- userId
- status (ACTIVE | CHECKED_OUT)
- createdAt
- updatedAt

## Relations

- user
- cartItems

---

# CartItem

A single line item inside a Cart. Each unique customization variant is a separate row.

## Fields

- id
- cartId
- productId
- sellerId
- quantity (1..99)
- unitPriceSnapshot (Decimal, EUR)
- customizationText (optional, max 500 chars)
- customizationColor (optional, max 50 chars)
- customizationSize (optional, max 50 chars)
- customizationImageUrl (optional, https only)

## Relations

- cart
- product
- seller

---

# Key Relations Summary

```plaintext
User -> Orders -> OrderItems -> Products -> Seller
User -> Cart -> CartItems -> Products -> Seller
Order -> Payment
Product -> OrderItem
User -> Uploads
Role -> User
Seller -> Product / Order / CartItem
```
