# Security policy

## Reporting a vulnerability

**Please do not open a public issue.** Report it privately using GitHub's **Report a vulnerability** button on the repository's **Security** tab (private vulnerability reporting).

Include what you found, how to reproduce it, and the impact. **Never include real phone numbers, national IDs or birth dates**; use fake values.

We work on a best-effort basis: expect an initial reply within about 7 days, and we will keep you updated on the fix. Please give us reasonable time to fix the issue before disclosing it publicly.

## Scope

Pa-Varaq stores sensitive identity data, so the following are treated as high priority:

- **Identity data exposure:** last name, national ID, phone number and birth date must only ever be returned to their owner. Anything that leaks them to other users, logs or error messages is a vulnerability. Public user data is limited to first name, `@username`, avatar, trust score and karma tokens.
- **Login (OTP):** bypassing or brute-forcing the one-time code, the rate limits, or account takeover by phone number.
- **Loan handshake (PINs):** guessing, reading or reusing the 4-digit handover/return PINs, or skipping the PIN-protected steps of the loan state machine.
- **Authorization:** acting on other users' books, loans or profiles; bypassing the identity-verification gate.
- **Token economy:** minting or stealing karma tokens.

Out of scope: findings that need a modified or already-compromised device, missing best-practice headers without a demonstrated impact, social engineering, and issues in third-party services (report those upstream). Development defaults such as `DEV_FIXED_OTP` are for local use only and must never be enabled in production.

## Logging

API logs redact authorization and cookie headers, phone numbers, national identifiers, birth dates and OTP fields from structured request data. The console OTP sender is a development-only fallback and masks phone numbers; production deployments must configure a real OTP delivery provider.

## Supported versions

Only the latest commit on `main` is supported.
