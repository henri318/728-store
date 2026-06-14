# Module: Payments

# Responsibility
Decoupled payment management.

# Initial Provider
- PayPal (via adapter)

# Emitted Events
- PaymentInitialized
- PaymentCompleted
- PaymentVerified

# Listened Events
- OrderCreated

# Use Cases
- createPaymentSession
- verifyPaymentWebhook
