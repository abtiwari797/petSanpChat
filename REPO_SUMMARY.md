## Repository Summary — petSanpChat

Date: 2025-11-09

This document captures an inventory and concise summary of the codebase, architecture, key flows, notable issues, and recommended next steps so you can review later.

---

## What this project is

- A TypeScript Node.js GraphQL server using Apollo Server + Express and TypeGraphQL.
- Authentication and user management are handled with Clerk (Clerk SDK).
- PostgreSQL (TypeORM) is used for primary user records; MongoDB (Mongoose) is used for ephemeral OTP storage.
- Main flows:
  - User signup: create a Clerk user, send a 6-digit OTP via email, store OTP in MongoDB, verify OTP to mark the Postgres user as verified.
  - Clerk webhooks: receive Clerk events and upsert/delete user records in Postgres.

## Key files and purpose

- `src/index.ts` — app bootstrap: connects to MongoDB and Postgres, builds GraphQL schema, attaches Clerk webhook and starts the server.
- `src/config/clerk.ts` — Clerk client initialization.
- `src/config/mongodb.ts` — MongoDB connection helper (currently contains a hard-coded connection string).
- `src/config/postgres.ts` — TypeORM DataSource configuration (supports Neon via `DATABASE_URL` or local env variables).
- `src/middleware/auth.ts` — verifies Clerk sessions from the Authorization header.
- `src/service/user.service.ts` — user creation logic: checks for existing user in Postgres, creates Clerk user, sends OTP, stores OTP in MongoDB.
- `src/resolvers/UserResolver.ts` — GraphQL queries/mutations for creating users, verifying OTPs, and fetching users.
- `src/db/repository.ts` — helper to get a TypeORM repository via `AppDataSource.getRepository`.
- `src/model/userOtpSchema.ts` — Mongoose schema/model for OTPs (`UserOTP`).
- `src/utils/sentOtp.ts` — uses nodemailer to send OTP emails.
- `src/webhooks/clerk.ts` — Svix webhook verification and sync logic for `user.created`, `user.updated`, `user.deleted`.
- `src/utils/logger.ts` — winston logger configuration with console + file transports.

## Contract (core functions)

- createUser(SignupArgs):
  - Input: signup args (firstName, lastName, username, email, password, dob, phoneNumber)
  - Output: created Clerk user object
  - Error modes: throws if user exists, Clerk creation fails, email sending fails, or OTP save fails.

- verifyOtp({email, otp, type}):
  - Checks the OTP entry in MongoDB, ensures not expired, deletes OTP record, marks the Postgres user as `isVerified = true`.
  - Returns a success/failure message.

- Webhook `POST /webhooks/clerk`:
  - Expects raw body and `CLERK_WEBHOOK_SECRET`.
  - Verifies signature with Svix, then upserts or deletes the user in Postgres.

## Notable implementation details

- TypeORM `synchronize: true` is enabled in `src/config/postgres.ts` (ok for dev, disable for production).
- MongoDB connection string is hard-coded in `src/config/mongodb.ts` (contains credentials). Move to env.
- `sendOTPEmail` uses `smtp.gmail.com` and expects `SMTP_USER` and `SMTP_PASS` env vars.
- Logger writes to `logs/error.log` and `logs/combined.log`.

## Bugs and inconsistencies found (actionable)

1. OTP query mismatch (critical):
   - `src/model/userOtpSchema.ts` defines `userId` for the user reference.
   - `src/resolvers/UserResolver.ts` queries OTPs with `{ email, otp, type }` (there is no `email` field in the OTP schema). This will cause OTP verification to fail.
   - Fix: change resolver queries to use `userId: email` (or change schema to include `email`). Prefer using `userId`.

2. Hard-coded secrets (security risk):
   - `src/config/mongodb.ts` contains a `mongodb+srv://` connection string with credentials.
   - `src/config/postgres.ts` includes a default password value in code.
   - Fix: move all secrets and connection URIs to environment variables; remove credentials from source control and add to `.env` (and `.gitignore`).

3. `synchronize: true` for TypeORM (dangerous in prod):
   - Recommended to set to `false` in production and use migrations.
## Repository Summary — petSanpChat

Date: 2025-11-09 (updated 2025-11-09)

This document captures an inventory and concise summary of the codebase, architecture, key flows, notable issues, and recommended next steps so you can review later.

---

## What this project is

- A TypeScript Node.js GraphQL server using Apollo Server + Express and TypeGraphQL.
- Authentication and user management are handled with Clerk (Clerk SDK).
- PostgreSQL (TypeORM) is used for primary user records; MongoDB (Mongoose) is used for ephemeral OTP storage.
- Main flows:
   - User signup: create a Clerk user, send a 6-digit OTP via email, store OTP in MongoDB, verify OTP to mark the Postgres user as verified.
   - Clerk webhooks: receive Clerk events and upsert/delete user records in Postgres.
   - Forgot / reset password (unauthenticated): send OTP to email, verify OTP + set new password in Clerk.
   - Change password (authenticated): logged-in users can change password via session-based mutation.

## Key files and purpose

- `src/index.ts` — app bootstrap: connects to MongoDB and Postgres, builds GraphQL schema, attaches Clerk webhook and starts the server.
- `src/config/clerk.ts` — Clerk client initialization.
- `src/config/mongodb.ts` — MongoDB connection helper (currently contains a hard-coded connection string).
- `src/config/postgres.ts` — TypeORM DataSource configuration (supports Neon via `DATABASE_URL` or local env variables).
- `src/middleware/auth.ts` — verifies Clerk sessions from the Authorization header and injects `session` into GraphQL context.
- `src/service/user.service.ts` — user logic: signup, send OTP, save OTP, send password-reset OTP, verify OTP and update password, change password for authenticated users.
- `src/resolvers/UserResolver.ts` — GraphQL queries/mutations: `createUser`, `verifyOtp`, `forgotPassword`, `resetPassword`, `changePassword`, `getUsers`.
- `src/db/repository.ts` — helper to get a TypeORM repository via `AppDataSource.getRepository`.
- `src/model/userOtpSchema.ts` — Mongoose schema/model for OTPs (`UserOTP`) with fields `userId`, `type`, `otp`, `expireAt`.
- `src/utils/sentOtp.ts` — uses nodemailer to send OTP emails.
- `src/webhooks/clerk.ts` — Svix webhook verification and sync logic for `user.created`, `user.updated`, `user.deleted`.
- `src/utils/logger.ts` — winston logger configuration with console + file transports.

## Contract (core functions)

- createUser(SignupArgs):
   - Input: signup args (firstName, lastName, username, email, password, dob, phoneNumber)
   - Output: created Clerk user object
   - Error modes: throws if user exists, Clerk creation fails, email sending fails, or OTP save fails.

- verifyOtp({email, otp, type}):
   - Checks the OTP entry in MongoDB (queries by `userId: email`), ensures not expired, deletes OTP record, marks the Postgres user as `isVerified = true`.

- forgotPassword(email):
   - Unauthenticated: sends OTP to email and stores a `password_reset` OTP in MongoDB.

- resetPassword({email, otp, newPassword}):
   - Unauthenticated completion: verifies OTP and updates the user's password in Clerk.

- changePassword(newPassword):
   - Authenticated: extracts `session` from GraphQL context, gets `clerkId` from session, updates password in Clerk.

## Notable implementation details

- TypeORM `synchronize: true` is enabled in `src/config/postgres.ts` (ok for dev, disable for production).
- MongoDB connection string is hard-coded in `src/config/mongodb.ts` (contains credentials). Move to env.
- `sendOTPEmail` uses `smtp.gmail.com` and expects `SMTP_USER` and `SMTP_PASS` env vars.
- Logger writes to `logs/error.log` and `logs/combined.log`.
- OTPs are stored in MongoDB as plain text currently; queries use `userId` for lookup.
- Clerk password updates are performed via the Clerk SDK `clerk.users.updateUser(clerkId, { password })`. The code now logs detailed Clerk errors (without passwords) to help debug 422 responses.

## Fixes applied in this branch

1. OTP lookup bug fixed: resolver now queries `UserOTP` by `userId: email` (previously used `email` field that didn't exist).
2. Forgot/reset password flow implemented: `forgotPassword` and `resetPassword` mutations + service methods added.
3. Authenticated change password implemented: `changePassword` mutation and `changePasswordForLoggedInUser` service method added.
4. Clerk error serialization/logging added around `clerk.users.updateUser` to capture 422 responses safely for debugging.

## Bugs and remaining inconsistencies (actionable)

1. Hard-coded secrets (security risk):
    - `src/config/mongodb.ts` contains a `mongodb+srv://` connection string with credentials.
    - `src/config/postgres.ts` includes a default password value in code.
    - Fix: move all secrets and connection URIs to environment variables; remove credentials from source control and add to `.env` (and `.gitignore`).

2. `synchronize: true` for TypeORM (dangerous in prod):
    - Recommended to set to `false` in production and use migrations.

3. OTPs stored in plain text:
    - Consider hashing OTPs or storing HMACs so raw OTPs aren't present in backups.

4. Authorization header format:
    - `auth` middleware expects `Authorization: Bearer <sessionId> <sessionToken>` — this is non-standard. Either document this clearly or adopt a single-token Bearer scheme.

## Edge cases to consider

- Missing SMTP env vars will cause OTP sending to fail — handle and surface a clear error.
- Race conditions between deleting OTP and setting verified flag are possible but likely acceptable in this flow; if stronger guarantees are needed, wrap in a transaction or use a lock.
- OTP reuse: OTPs are single-use and deleted on verification; ensure no duplicate field mismatch prevents deletion.

## Low-risk, high-value followups

1. Move DB and SMTP credentials to environment variables and add `.env.example`.
2. Hash OTPs at rest (HMAC) and compare hashes during verification.
3. Add server-side password-strength validation for `resetPassword` and `changePassword`.
4. Add rate-limiting for `forgotPassword` to mitigate abuse.
5. Turn off TypeORM `synchronize` in production and add migration scripts.

## Suggested next steps (developer actions)

- Add `.env.example` documenting required env vars (`CLERK_API_KEY`, `CLERK_WEBHOOK_SECRET`, `DATABASE_URL` or DB_HOST/PORT/..., `MONGO_URI`, `SMTP_USER`, `SMTP_PASS`).
- Add unit tests for `UserService.sendPasswordReset`, `UserService.resetPassword`, and `UserService.changePasswordForLoggedInUser`.
- Consider switching to Clerk's reset-token flow if your Clerk configuration disallows admin-side password updates.

## How to test the password flows (dev)

1. Forgot / Reset (unauthenticated):
    - Mutation (send OTP):
       ```json
       { "query": "mutation { forgotPassword(email: \"user@example.com\") { success message } }" }
       ```
    - Mutation (reset with OTP):
       ```json
       { "query": "mutation { resetPassword(email: \"user@example.com\", otp: \"123456\", newPassword: \"NewStrongP@ssw0rd\") { success message } }" }
       ```
    - Verify: OTP document exists in MongoDB (`userotps` collection) with `userId` equal to the email, `type: password_reset`, and `expireAt > Date.now()`.

2. Change password (authenticated):
    - Ensure client sends Clerk session (authorization header) so GraphQL context contains `session`.
    - Mutation:
       ```json
       { "query": "mutation { changePassword(newPassword: \"NewStrongP@ssw0rd\") { success message } }" }
       ```

---

If you'd like, I can now: add a `.env.example`, add OTP-hashing and server-side password validation, or create a Postman collection with the GraphQL requests prefilled. Tell me which one to do next.
