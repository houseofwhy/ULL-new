# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |

## Reporting a Vulnerability

Please report vulnerabilities privately through the
[Discord server](https://discord.gg/9wVWSgJSe8) — DM the Website Coder
**Prometheus** (`@prometheus.dev`), or the **List Leader QwidziT** (`@qwidzit`).

Please do not open a public issue for security problems. Response times vary with
the severity and complexity of the report, typically from a few hours to a couple
of days.

## Official channels

Only these accounts speak for the Upcoming Levels List. Anything else claiming to
be ULL — including any Telegram group, which the project no longer runs — is not
us, and staff will never ask you for an API key there.

| Channel | Where |
|---------|-------|
| Discord | <https://discord.gg/9wVWSgJSe8> |
| X | [@ull_gd](https://x.com/ull_gd) |
| Website | <https://ull.pages.dev> |

## Editor API keys

Staff write access is a per-editor API key; the database stores only its SHA-256
hash, never the key itself. Always create keys with the **Generate** button in the
admin panel (32 random bytes) rather than choosing one by hand — a random key is
uncrackable even if its hash leaks, whereas a guessable one is not.

Wrong-key attempts are rate-limited per IP (10 tries per 15 minutes, then a 15-minute
block), so a leaked hash cannot be brute-forced online.

If a key is exposed, tell an admin — they can revoke it from the admin panel's
**Editors** tab (Delete, then re-add to issue a new one). Renaming an editor
deliberately keeps their existing key, so it is not a way to rotate one.

Do not commit database dumps: a full `editor_keys` export contains every key hash.
The pre-migration backup that used to live in this repo was removed for exactly that
reason.
