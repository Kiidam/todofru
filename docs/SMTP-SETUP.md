SMTP configuration

Environment variables supported by src/lib/mailer.ts

- SMTP_HOST
- SMTP_PORT (default 587)
- SMTP_SECURE ("1" or "true" for TLS)
- SMTP_USER
- SMTP_PASS
- SMTP_FROM (fallback no-reply@todofru.local)

If not configured, emails are sent to a JSON transport for local development.
