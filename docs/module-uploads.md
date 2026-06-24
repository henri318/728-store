# Module: Uploads

# Responsibility

File management for the platform. Handles presigned URL generation for direct client-to-R2 uploads, upload confirmation, metadata management, and orphan cleanup. Uses Cloudflare R2 as the storage backend with permanent public URLs for SEO-friendly asset access.

# Architecture

The uploads module follows hexagonal architecture:

- **Domain**: Core entities (`Upload`), value objects (`UploadType`, `UploadStatus`), ports (`StoragePort`, `UploadRepository`), and domain events.
- **Application**: Use cases that orchestrate business logic without infrastructure concerns.
- **Infrastructure**: Adapters for R2 storage (`R2StorageAdapter`) and Prisma persistence (`PrismaUploadRepository`).
- **Presentation**: API routes and Zod schemas for request validation.

# Emitted Events

- `file.uploaded` — Emitted when an upload is confirmed (status transitions to CONFIRMED).
- `file.deleted` — Emitted when an upload is deleted (both metadata and R2 object).

# Listened Events

None currently. Other modules can subscribe to `file.uploaded` / `file.deleted` to react to file lifecycle changes.

# Use Cases

- **CreateUploadUseCase** — Creates a pending upload record and generates a presigned PUT URL for direct R2 upload.
- **ConfirmUploadUseCase** — Marks a pending upload as CONFIRMED after the client finishes uploading, emits `file.uploaded`.
- **GetUploadUseCase** — Retrieves upload metadata by ID.
- **DeleteUploadUseCase** — Deletes upload metadata and R2 object, emits `file.deleted`. Enforces ownership or admin role.
- **GenerateReadUrlUseCase** — Generates a presigned GET URL for temporary access to private uploads.
- **CleanupUploadsUseCase** — Removes orphaned pending uploads older than 24 hours (used by cron job).

# API Endpoints

| Method | Path                         | Description                                     | Auth                 |
| ------ | ---------------------------- | ----------------------------------------------- | -------------------- |
| POST   | `/api/uploads/presigned-url` | Create pending upload, return presigned PUT URL | Session required     |
| POST   | `/api/uploads/[id]/confirm`  | Confirm upload, emit `file.uploaded`            | Session required     |
| GET    | `/api/uploads/[id]`          | Get upload metadata                             | Session required     |
| DELETE | `/api/uploads/[id]`          | Delete upload (owner or admin)                  | Session required     |
| GET    | `/api/uploads/[id]/url`      | Generate presigned read URL                     | Session required     |
| GET    | `/api/cron/cleanup-uploads`  | Run orphan cleanup (cron)                       | `CRON_SECRET` header |

# Storage Backend

Uses Cloudflare R2 (S3-compatible API) via `@aws-sdk/client-s3`. Environment variables:

- `R2_BUCKET` — R2 bucket name
- `R2_ACCOUNT_ID` — Cloudflare account ID
- `R2_ACCESS_KEY_ID` — R2 API token access key
- `R2_SECRET_ACCESS_KEY` — R2 API token secret key
- `R2_PUBLIC_DOMAIN` — Public domain for permanent URLs (e.g., `https://cdn.example.com`)

# Cron Job

The `CleanupUploadsUseCase` runs daily at 03:00 UTC via Vercel Cron (`vercel.json`). It removes pending uploads older than 24 hours that were never confirmed (orphaned uploads). Protected by `CRON_SECRET` environment variable.

# Key Design Decisions

1. **Presigned URLs**: Clients upload directly to R2, bypassing the server for large file transfers. The server only manages metadata and generates time-limited presigned URLs.
2. **Permanent public URLs**: Confirmed uploads get stable public URLs via `R2_PUBLIC_DOMAIN`. This is critical for SEO, social sharing, and CDN caching (product images, avatars).
3. **Two-phase upload**: Pending → Confirmed. If a client starts an upload but never confirms, the orphan is cleaned up by the cron job after 24 hours.
4. **Allowed extensions**: `.jpg`, `.jpeg`, `.png`, `.webp` (case-insensitive). Validated at the application layer.
5. **Ownership enforcement**: DELETE operations check that the requester is the upload owner or an ADMIN.
