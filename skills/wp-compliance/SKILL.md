---
name: wp-compliance
description: WordPress plugin security compliance. Invoke before writing, editing, or reviewing any WordPress plugin or theme code.
type: rigid
---

> **[WP Code Compliance applied — 19 rules active]**

This skill is rigid. Follow every rule exactly. Do not skip or relax any item.

## When to Invoke

Invoke this skill before:
- Writing any new WordPress plugin or theme PHP code
- Editing existing plugin/theme files (`.php`, `functions.php`, REST handlers, AJAX handlers)
- Reviewing WordPress code for security issues
- Adding shortcodes, REST routes, AJAX endpoints, settings pages, file upload handlers

**No exceptions for simple or single-line fixes.** A one-line change can introduce a SQL injection, missing escape, or auth bypass just as easily as a large feature. Simplicity of the change is not a reason to skip this skill.

## Pre-Code Checklist

Run through this before writing any code. Every item must be addressed:

- [ ] All `$_GET`, `$_POST`, `$_REQUEST`, `$_COOKIE`, REST/AJAX input validated at entry
- [ ] Output escaped at render time, context-specific (`esc_html`, `esc_attr`, `esc_url`, `wp_kses`, etc.)
- [ ] Capability check in place for every privileged action
- [ ] Nonce verified for state-changing requests — paired with a capability check, never alone
- [ ] No raw variables in SQL — `$wpdb->prepare()` used for values, allowlists for column/direction names
- [ ] No hardcoded API keys, tokens, or credentials
- [ ] No `eval()`, `unserialize()` on untrusted data, or dynamic includes from user input

---

## Rules

### 1 — Input & Output

**1. Do not trust any input.**
Do not trust `$_GET`, `$_POST`, `$_REQUEST`, `$_COOKIE`, REST input, AJAX payloads, shortcode attrs, uploaded files, third-party API responses, or values already stored in your own database. Validate first, sanitize when needed. WordPress guidance explicitly favors validation over sanitization when you can define allowed values.

**2. Do not sanitize once and assume it is safe forever.**
A value can be valid for storage but unsafe for HTML, attributes, JavaScript, URLs, SQL, or JSON output. Sanitizing input and escaping output are separate steps with different purposes. Do not reuse a "cleaned" value across contexts.

**3. Do not skip escaping on output.**
Escape as late as possible and for the exact output context. This applies to admin pages, settings screens, notices, metaboxes, REST responses rendered in JS templates, and frontend markup. WordPress explicitly recommends escaping right before rendering.

**15. Do not output raw HTML unless you truly control it.**
If HTML is allowed in a settings field, apply a strict allowed-tags policy via `wp_kses`. For plain text settings, keep them plain text. Do not save and reprint arbitrary HTML from user-controlled fields.

---

### 2 — Auth & Access Control

**4. Do not rely on nonces as permission checks.**
A nonce is not authorization. `check_admin_referer()` and `check_ajax_referer()` protect against CSRF — they do not decide whether a user is allowed to act. Always pair nonce checks with capability checks.

**5. Do not skip capability checks.**
Do not let any logged-in user hit privileged actions just because they can access wp-admin, an AJAX endpoint, or a REST route. Check the exact capability required for the action. This applies to settings saves, imports, exports, deletes, remote requests, and debug tools.

**11. Do not make privileged AJAX or REST routes too open.**
Every state-changing route must verify a nonce where relevant and check capabilities explicitly. Do not assume "admin page only" means the endpoint is safe — attackers call endpoints directly.

**12. Do not use broad, weak capabilities.**
Do not default to `manage_options` for everything. Use the smallest capability that matches the action. Do not grant dangerous actions to lower roles for convenience.

**16. Do not assume admin-only means safe.**
Admin pages still process untrusted input, can suffer CSRF without nonces, and can expose XSS if output is not escaped. Apply the same security rules on both admin and public sides.

---

### 3 — Database

**6. Do not build SQL with raw variables.**
Do not concatenate untrusted values into SQL — including `WHERE`, `ORDER BY`, `LIMIT`, `IN (...)`, table names, meta keys, or search fragments. Use `$wpdb->prepare()` for values. Whitelist allowed columns and sort directions for sortable fields.

**7. Do not accept "sanitized enough" SQL fragments.**
Do not pass around a prebuilt `$where_clause`, `$orderby`, or `$limit` string assembled from request values. Even if parts look cleaned, they are easy to get wrong. Build query parts from fixed templates and strict allowlists. This includes fragments individually pre-escaped with `$wpdb->prepare()` — the correct pattern is to keep SQL templates and values in separate arrays, then call `$wpdb->prepare()` once on the complete query with all values merged.

**19. Do not build dynamic WHERE clauses for Plugin Check-compatible code.**
Plugin Check's static analyzer cannot follow dynamically assembled `$where_sql` variables, even when properly prepared — it will flag `{$where_sql}` as `InterpolatedNotPrepared` and `UnescapedDBParameter` regardless. The correct pattern is static SQL templates with opt-out bypass conditions:
```php
// Instead of: $where_sql = implode(' AND ', $conditions); ... WHERE {$where_sql}
// Use a static template with bypass per optional filter:
$wpdb->prepare(
    "WHERE (%s = '' OR r.match_type = %s) AND (%s = '' OR r.asset_type = %s) LIMIT %d",
    $match_type, $match_type, $asset_type, $asset_type, $limit
);
// Pass '' for inactive filters ('' = '' is TRUE, condition bypassed).
// Pass the real value twice for active filters (first arg fails, second filters).
```
This gives a fixed argument count, no interpolated variables, and full static verifiability. *(user flagged 2026-04-10)*

---

### 4 — Files, Uploads & Remote Requests

**8. Do not allow unsafe file uploads.**
Do not trust file names, browser MIME types, file extensions, or image metadata. Do not let users upload PHP-capable files, SVGs, archives, or arbitrary documents without a safe handling path. Validate tightly. Storage paths must not allow execution.

**13. Do not allow arbitrary remote requests.**
Do not let request parameters decide remote URLs, webhook targets, download locations, or proxy destinations — this enables SSRF and data exfiltration. If the plugin talks to external services, use a strict domain allowlist and safe request patterns.

**14. Do not eval, unserialize, or execute user-controlled content.**
Do not use `eval()`, dynamic includes from user input, shell execution functions, or `unserialize()` on untrusted data. These are high-risk patterns that can get a plugin rejected or pulled if exploited.

---

### 5 — Secrets, Logs & Cleanup

**9. Do not expose debug data to normal users.**
Do not leave debug endpoints, diagnostic pages, raw logs, headers, stack traces, SQL errors, tokens, or system paths visible to subscribers, customers, or anonymous visitors. Protect with capabilities and keep out of public web paths.

**10. Do not store secrets carelessly.**
Do not hardcode API keys, license secrets, or private tokens. Do not print them into HTML, localize them to JS unless absolutely necessary, or expose them in error messages. Keep sensitive values minimal, access-controlled, and out of logs.

**17. Do not ignore uninstall and cleanup security.**
Do not leave behind unsafe options, cron jobs, temp files, logs, or custom tables with sensitive data after uninstall. Uninstall routines must include proper permission checks.

**18. Do not hide problems with phpcs ignores if the code is actually unsafe.**
Do not silence Plugin Check or PHPCS warnings unless the warning is a genuine false positive you can justify. The real fix is usually the right fix.

---

## Safe Default Order

Every WordPress action should follow this sequence:

```
validate input → sanitize when needed → check capability → verify nonce → perform action safely → escape output late
```

---

## Quick Release Checklist

Before releasing or committing, confirm you are NOT:

- [ ] Echoing raw data anywhere
- [ ] Using request values in SQL
- [ ] Saving settings without capability + nonce checks
- [ ] Exposing debug pages or logs
- [ ] Trusting uploads, remote URLs, or API responses
- [ ] Relying on sanitization alone instead of validation + escaping
- [ ] Ignoring Plugin Check warnings without justification

---

## Appending New Rules

When the user identifies a new security concern or coding issue:

1. Add it as a numbered rule (continue the numbering: 19, 20, …)
2. Place it under the most appropriate category above
3. Update the pre-code checklist if the new rule warrants a mandatory check
4. Update the quick release checklist if it applies at review time
5. Note the source (e.g., "user flagged 2026-04-10")
