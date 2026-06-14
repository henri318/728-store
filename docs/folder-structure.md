# Folder Structure

# Project Structure

```plaintext
/modules
  /orders
  /payments
  /products
  /tickets
  /ai
  /users
  /uploads
  /roles
  /sellers

/shared
  /events
  /kernel
  /utils

/app
  /(routes)
```

# Rules
- A module does not import another module.
- Shared contains only utilities and global events.
- App only orchestrates.
