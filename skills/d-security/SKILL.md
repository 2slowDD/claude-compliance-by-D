---
name: D-security
description: Use when building, reviewing, or auditing any web application for security compliance. Covers authentication, API security, database safety, infrastructure hardening, and production code hygiene.
---

# D-security — Web Application Security Checklist

## AUTHENTICATION
- [ ] Passwords hashed with bcrypt or argon2 (minimum 12 rounds)
- [ ] Tokens stored in httpOnly cookies — not localStorage
- [ ] JWT secret is random, at least 32 characters, not from a tutorial
- [ ] Access tokens expire (15 to 60 minutes max)
- [ ] Refresh token rotation implemented
- [ ] Rate limiting on /login and /register
- [ ] Account lockout after repeated failures
- [ ] Sessions invalidated server-side on logout
- [ ] Email verification required before access granted

## API SECURITY
- [ ] Every route verified for authentication (check all endpoints, not just obvious ones)
- [ ] Authorization checked: each user can only access their own data
- [ ] All request inputs validated with schema validation (Zod, Joi, etc.)
- [ ] API responses never include passwords, hashes, or internal fields
- [ ] Error messages don't reveal system internals or file paths
- [ ] Rate limiting on all public-facing endpoints
- [ ] CORS restricted to your domain (not wildcard *)
- [ ] HTTPS enforced, HTTP redirected

## DATABASE
- [ ] No SQL string concatenation (use parameterized queries or ORM)
- [ ] Application uses a limited-permission DB user, not root
- [ ] Database not publicly accessible (behind VPC or firewall rule)
- [ ] Backups configured and restore has been tested (not just backup)
- [ ] Sensitive fields encrypted at rest

## INFRASTRUCTURE
- [ ] All secrets in environment variables, not source code
- [ ] .env not in git history (run: git log -- .env)
- [ ] SSL certificate installed and valid
- [ ] Server not running as root user
- [ ] Only ports 80 and 443 publicly accessible

## CODE
- [ ] No console.log statements in production build
- [ ] `npm audit` run, all critical vulnerabilities resolved
- [ ] No hardcoded credentials anywhere in the codebase

## OWASP TOP 10 — COMMON GAPS

These complement the categories above. Focus on vulns that frequently slip past generic checklists.

### A01 — Broken Access Control (IDOR)
- [ ] Every object lookup verifies ownership server-side: `GET /orders/:id` must confirm the order belongs to the requesting user
- [ ] Object IDs are not sequential/guessable **or** ownership is enforced regardless (prefer both)
- [ ] Admin/user role separation enforced server-side on every privileged route (never trust client-supplied role claims)
- [ ] Direct object references via URL, form body, JSON body, and query string are all revalidated
- [ ] Default deny: unknown routes and unknown permissions return 403, not 200

### A03 — Injection (XSS)
- [ ] User input escaped **at render time, per context** (HTML body, attribute, JS, URL, CSS — different rules for each)
- [ ] Framework's default auto-escaping not bypassed: no `dangerouslySetInnerHTML`, `v-html`, `{{{ }}}`, or `innerHTML` with user data
- [ ] Rich-text / user HTML run through an **allowlist** sanitizer (DOMPurify, bluemonday) — never a blocklist
- [ ] `Content-Security-Policy` header set with a strict `script-src` — no `'unsafe-inline'`, no wildcard origins
- [ ] Stored-XSS sinks (comments, profiles, admin views) tested with payloads, not only by eyeballing the live DOM

### A08 — Data Integrity (Deserialization & Supply Chain)
- [ ] Never deserialize untrusted data with native language deserializers: `pickle`, PHP `unserialize`, Java `ObjectInputStream`, `yaml.load`
- [ ] Use safe formats: JSON with schema validation, `yaml.safe_load`, MessagePack with a strict schema
- [ ] Signed/encrypted payloads (JWT, cookies) verified **before** parsing — never parse first, verify after
- [ ] Lockfile committed (`package-lock.json`, `yarn.lock`, `poetry.lock`, `composer.lock`); CI fails on unexpected lockfile mutation
- [ ] Private/internal packages pinned to a private registry; npm scope spoofing blocked

### A10 — SSRF
- [ ] Server-side HTTP clients block requests to private/internal ranges: `10/8`, `172.16/12`, `192.168/16`, `127/8`, `169.254/16`, IPv6 link-local and ULA
- [ ] DNS rebinding blocked — resolve, validate, then connect by IP; or enforce at the HTTP-client layer
- [ ] URL schemes restricted to `http`/`https` only — no `file://`, `gopher://`, `dict://`, `ftp://`
- [ ] Redirects followed only within an allowlist, or disabled entirely
- [ ] Webhooks, "import from URL", link-previews, and PDF/image generation features all route through the same SSRF guard

### File Upload
- [ ] File type validated by **content** (magic bytes), not by extension or the client-supplied `Content-Type` header
- [ ] Uploads stored outside the web root, or served via a download endpoint that sets `Content-Disposition: attachment`
- [ ] Filenames sanitized: strip path separators and null bytes; prefer a server-generated UUID over any client-supplied name
- [ ] Size limits enforced at **both** the web server (e.g. nginx `client_max_body_size`) and the application layer
- [ ] No execution permissions on the upload directory; SVG and HTML uploads treated as hostile by default
- [ ] Image uploads re-encoded server-side (strips EXIF metadata and any embedded scripts)
- [ ] Malware scanning applied where the uploaded file will be shared with other users (ClamAV or cloud equivalent)
