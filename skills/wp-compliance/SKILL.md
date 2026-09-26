---
name: wp-compliance
description: WordPress plugin security compliance. Invoke before writing, editing, or reviewing any WordPress plugin or theme code.
type: rigid
---

> **[WP Code Compliance applied — 34 rules active]**

This skill is rigid. Follow every rule exactly. Do not skip or relax any item.

## When to Invoke

Invoke this skill before:
- Writing any new WordPress plugin or theme PHP code
- Editing existing plugin/theme files (`.php`, `functions.php`, REST handlers, AJAX handlers)
- Reviewing WordPress code for security issues
- Adding shortcodes, REST routes, AJAX endpoints, settings pages, file upload handlers
- **Dispatching any subagent whose task involves writing or editing WordPress PHP** — the compliance check must happen in the controller, before the first subagent is dispatched, not after

**No exceptions for simple or single-line fixes.** A one-line change can introduce a SQL injection, missing escape, or auth bypass just as easily as a large feature. Simplicity of the change is not a reason to skip this skill.

## Subagent Dispatch Rules

When using subagent-driven development (superpowers:subagent-driven-development or equivalent) on a WordPress plugin or theme:

1. **Invoke wp-compliance once, in the controller, before dispatching Task 1.** Do not defer it to the implementer.
2. **Include a WP Compliance section in every implementer subagent prompt**, pasting the Pre-Code Checklist and the Safe Default Order verbatim:

```
## WP Compliance (mandatory)

Run through this checklist before writing any code:
- Every PHP file starts with a plain ABSPATH guard (`defined( 'ABSPATH' ) || exit;`), with no extra condition such as a CLI exception for tests (Rule 21)
- All $_GET/$_POST/$_REQUEST/$_COOKIE/$_SERVER/REST/AJAX input validated at entry
- Output escaped at render time, context-specific (esc_html, esc_attr, esc_url, wp_kses)
- Capability check in place for every privileged action
- Nonce verified for state-changing requests — paired with capability check, never alone
- No raw variables in SQL — $wpdb->prepare() for values, allowlists for column/direction names; LIKE wildcards passed as %s via $wpdb->esc_like()
- Sanitizer is flat and outermost (e.g. `absint( wp_unslash( $_GET['x'] ?? 0 ) )`), not nested inside trim()/strtolower()/etc.
- JSON input: wp_unslash → json_decode → sanitize decoded values (do NOT sanitize_text_field before decode)
- Structured POST/REST maps (nested arrays from bracket-syntax forms or FormData): walk + sanitize per-value, not just outer `(array) wp_unslash`
- No hardcoded API keys, tokens, or credentials
- No eval(), unserialize() on untrusted data, or dynamic includes from user input
- Every add_action/add_filter callback parameter is `mixed` (or nullable), normalized inside the body — a non-nullable `string`/`int`/`array` type on a hook callback is an uncatchable fatal waiting for a caller that passes null (Rule 29)
- No syntax newer than the plugin header's `Requires PHP` — `readonly`, enums, `never`, `true`/`null` types are fatals on older PHP (Rule 30)
- No outbound HTTP request before the user explicitly opts in — not on activation, `admin_init`, page load or cron (Rule 31)
- Release files have consistent line endings (no Plugin Check `Internal.LineEndings.Mixed`)

Safe order: validate input → sanitize when needed → check capability → verify nonce → perform action safely → escape output late
```

3. **Reviewers (spec compliance and code quality) must also receive this checklist** in their prompt so they can flag violations the implementer missed.
4. Failing to include compliance context in a subagent prompt is the same P10 violation as not invoking the skill at all — the subagent writes code without safety constraints.

## Pre-Code Checklist

Run through this before writing any code. Every item must be addressed:

- [ ] Every PHP file starts with `defined( 'ABSPATH' ) || exit;` or `if ( ! defined( 'ABSPATH' ) ) { exit; }` — exactly that shape, no extra condition (Rule 21)
- [ ] All `$_GET`, `$_POST`, `$_REQUEST`, `$_COOKIE`, `$_SERVER`, REST/AJAX input validated at entry
- [ ] Output escaped at render time, context-specific (`esc_html`, `esc_attr`, `esc_url`, `wp_kses`, etc.)
- [ ] Capability check in place for every privileged action
- [ ] Nonce verified for state-changing requests — paired with a capability check, never alone
- [ ] No raw variables in SQL — `$wpdb->prepare()` used for values, allowlists for column/direction names, LIKE wildcards passed via `$wpdb->esc_like()` + `%s`
- [ ] Sanitizer is flat and outermost (`absint( wp_unslash( ... ) )`), not nested through `trim()`/`strtolower()`/etc.
- [ ] JSON input decoded before sanitizing (`wp_unslash` → `json_decode` → sanitize per-value)
- [ ] Structured POST/REST maps (nested arrays from bracket-syntax forms or FormData) walked + sanitized per-value — outer `(array) wp_unslash` is not sufficient
- [ ] No hardcoded API keys, tokens, or credentials
- [ ] No `eval()`, `unserialize()` on untrusted data, or dynamic includes from user input
- [ ] Every hook callback parameter is `mixed` (or nullable) and normalized in the body — never a non-nullable `string`/`int`/`array` type (Rule 29)
- [ ] No syntax newer than the header's `Requires PHP` (Rule 30)
- [ ] No outbound HTTP request before an explicit user opt-in (Rule 31)
- [ ] Release files have consistent line endings (no Plugin Check `Internal.LineEndings.Mixed`)

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

**31. Do not contact an external service before the user opts in.**
WordPress.org guideline 7: a plugin may not call an external server — key registration, "phone home", telemetry, balance or license checks — until the user has explicitly agreed. Activation hooks, `admin_init`, `plugins_loaded`, cron events and page-load AJAX are not consent.

- The opt-in is a deliberate action (a button, saving an API key), placed next to a plain statement of what is sent and to whom, with links to the service's terms and privacy policy.
- Gate every automatic call (a balance refresh on page load, a readiness check, a heartbeat poll) on the opt-in state: no key saved means no request.
- A retry cron may exist only because the opt-in scheduled it.
- List every service under `== External services ==` in readme.txt: what data is sent, when, and to which host. Check each claim against the real request payload, not against memory; operational events and "hashed" fields count as data sent.

```php
// Wrong — calls the service the moment the plugin is activated.
register_activation_hook( __FILE__, array( 'My_Plugin_Keys', 'register_free_key' ) );

// Right — only an administrator's click, with nonce + capability, triggers it.
add_action( 'wp_ajax_my_plugin_request_key', array( $ajax, 'request_key' ) );
```

Test it: in the no-opt-in state, mock every `wp_remote_*` function with `->never()` and call the page-load handlers. *(flagged 2026-09-26 after WordPress.org compliance audit)*

---

### 5 — Secrets, Logs & Cleanup

**9. Do not expose debug data to normal users.**
Do not leave debug endpoints, diagnostic pages, raw logs, headers, stack traces, SQL errors, tokens, or system paths visible to subscribers, customers, or anonymous visitors. Protect with capabilities and keep out of public web paths.

**10. Do not store secrets carelessly.**
Do not hardcode API keys, license secrets, or private tokens. Do not print them into HTML, localize them to JS unless absolutely necessary, or expose them in error messages. Keep sensitive values minimal, access-controlled, and out of logs.

**17. Do not ignore uninstall and cleanup security.**
Do not leave behind unsafe options, cron jobs, temp files, logs, or custom tables with sensitive data after uninstall. Uninstall routines must include proper permission checks.

**32. On uninstall, delete what you own — never a prefix you share.**
If another component (a companion plugin, a service plugin, an older product line) uses the same option prefix, `DELETE … WHERE option_name LIKE 'prefix\_%'` also deletes its data on every site where both are installed. List option and transient names explicitly; use a wildcard only for per-record keys that are unambiguously yours (`prefix_job_%`).

- Wrap the body of `uninstall.php` in a closure — `( static function () { … } )();` — so it defines no global variables for PrefixAllGlobals to flag.
- Clear every scheduled hook with `wp_unschedule_hook()`.
- Delete stored secrets (API keys, tokens, claim tokens) too; a secret left after deletion is Rule 10's failure in a place nobody looks.
- Test it falsifiably: assert the shared-prefix wildcard never appears in the executed SQL, and confirm the test goes red when you put one back. *(flagged 2026-09-26 after WordPress.org compliance audit)*

**18. Do not hide problems with phpcs ignores if the code is actually unsafe.**
Do not silence Plugin Check or PHPCS warnings unless the warning is a genuine false positive you can justify. The real fix is usually the right fix.

**20. Document phpcs:ignore only for genuine false positives — and justify each one.**
PHPCS cannot trace through helper methods, exception propagation paths, or include-scope. Common genuine false positives:
- `ExceptionNotEscaped` when the exception is caught and passed to `wp_send_json_error()` (not rendered as HTML)
- `NonceVerification.Missing` when nonce is verified in a shared helper (e.g. `$this->check()`)
- `NonPrefixedVariableFound` for variables in template files included within class methods (local scope, not global)
- `NonceVerification.Recommended` for token-based frontend endpoints where nonces are architecturally incompatible (e.g. headless browser requests)
- `WordPress.PHP.DevelopmentFunctions.error_log_error_log` when `error_log()` is used for intentional production server-side logging of exception details that are explicitly withheld from the browser response (i.e. the paired `wp_send_json_error()` call uses a generic message, not `$e->getMessage()`)
- `WordPress.DB.DirectDatabaseQuery.SchemaChange` (and the accompanying `DirectQuery` + `NoCaching`) for DDL statements (`ALTER TABLE … MODIFY COLUMN`, `CREATE TABLE`, `DROP TABLE`) inside a version-gated `maybe_upgrade()` migration block. `dbDelta()` cannot handle `MODIFY COLUMN` on ENUM or other structural changes; a direct `$wpdb->query()` is the only correct tool. Always gate with `version_compare()` to keep the block idempotent. *(flagged 2026-04-17)*
- `WordPress.WP.AlternativeFunctions.file_system_operations_{fopen,fclose,fwrite}` when the target is a PHP stream wrapper (`php://memory`, `php://output`, `php://temp`, `php://input`). `WP_Filesystem` operates on real filesystem paths and has no equivalent for stream wrappers — patterns like buffering CSV into `php://memory` before `ZipArchive::addFromString()`, or streaming response bodies via `php://output`, cannot go through it. Justify each instance with the specific stream and purpose. *(flagged 2026-04-24 after Plugin Check audit)*
- `WordPress.WP.AlternativeFunctions.file_system_operations_readfile` when streaming a server-generated temp file (from `wp_tempnam()` or similar) directly to the HTTP response body as a binary download. `readfile()` is the pragmatic choice for binary pass-through — loading via `file_get_contents()` would blow memory on large archives, and WP has no helper for this pattern. Justify with the source of the path and why memory-loading isn't viable. *(flagged 2026-04-24 after Plugin Check audit)*
Always add a trailing comment explaining *why* it is safe: `// phpcs:ignore Sniff.Name -- reason.` *(flagged in audit 2026-04-11)*

### PHPCS suppression playbook — placement mechanics

Before suppressing anything, try to **fix** it. Most sniffs warn about patterns that *should* change — use `$wpdb->prepare()` with placeholders, escape output with the context-specific `esc_*` function, flatten nested sanitizers (Rule 24), refactor dynamic WHERE to static template with bypass conditions (Rule 19), collapse a multi-line statement that doesn't need to be multi-line. Suppression is a last resort, only for genuine false positives with a clear human-readable justification.

When suppression **is** the right call, placement matters. These are the lessons from real audits where wrong placement forced multiple iterations before Plugin Check came back clean. *(flagged 2026-04-23 after Plugin Check iteration cycle)*

**1. Match the directive to the statement shape.**

| Statement shape | Directive | Notes |
|---|---|---|
| Single-line statement with all flagged sniffs on that one line | `// phpcs:ignore <sniffs> -- reason` directly above | Simplest; cheapest; prefer this. |
| Multi-line statement where sniffs fire on different lines (multi-line SQL string with `{$table}`, `prepare()` with spread args, ternary/conditional across lines) | `// phpcs:disable <sniffs> -- reason` before + `// phpcs:enable <sniffs>` after | Covers every line between the two directives. |
| Multi-line statement that can be collapsed without hurting readability | Collapse to single line + one `phpcs:ignore` above | Often cleanest — no closing directive, scope auto-correct. |

**2. Critical scope rule: `phpcs:ignore` applies to the first line of the next statement only.**

Sniffs fire per-line, not per-statement. Different sniffs within the same statement can land on different lines. A single-line `phpcs:ignore` above a multi-line statement covers the FIRST line of the statement — not lines 2, 3, 4 of the same SQL string.

```php
// Wrong — phpcs:ignore applies to line with $wpdb->query( ; sniff fires on string line, not covered.
// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name from plugin constant.
$wpdb->query(
    "ALTER TABLE `{$t}` ADD COLUMN `foo` INT"
);

// Fix A — collapse so one annotation covers the whole call:
// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name from plugin constant.
$wpdb->query( "ALTER TABLE `{$t}` ADD COLUMN `foo` INT" );

// Fix B — disable/enable brackets cover every line in between:
// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name from plugin constant.
$wpdb->query(
    "ALTER TABLE `{$t}` ADD COLUMN `foo` INT"
);
// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
```

**Stacked `phpcs:ignore` directives don't chain — the second consumes the first's scope before the target statement is reached.** Two consecutive `phpcs:ignore` lines above a single statement apply only the SECOND one — the first's one-line scope is spent on the second `phpcs:ignore` line. Combine all sniffs into a comma-separated list on one annotation, or use `phpcs:disable`/`phpcs:enable` brackets if you want independent justifications per sniff cluster.

```php
// Wrong — first directive's scope is spent on the second directive line; DirectQuery/NoCaching NOT suppressed on the target.
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- custom plugin table.
// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name from constant.
$count = (int) $wpdb->get_var( "SELECT COUNT(*) FROM `{$t}`" );

// Right — all three sniffs on one annotation line, single combined justification.
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- custom plugin table; table name from constant, not user input.
$count = (int) $wpdb->get_var( "SELECT COUNT(*) FROM `{$t}`" );
```

Two stacked annotations can look fine to `php -l` and to a human reviewer — the bug surfaces only in the next Plugin Check run, which still fires the first annotation's sniffs despite the visible directive. *(flagged 2026-04-24 after Plugin Check audit.)*

**3. Name every sniff that can fire inside the suppressed scope.** Partial sniff lists leak warnings. Common clusters observed:

| Pattern | Sniffs to list |
|---|---|
| Custom-table `$wpdb->get_var/update/insert/delete` (no `prepare()`) | `WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching` |
| `prepare()` with `{$table}` from constant | add `WordPress.DB.PreparedSQL.InterpolatedNotPrepared` |
| `prepare()` with `...$args` spread (runtime arg count) | add `WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare` |
| DDL inside `maybe_upgrade()` (`ALTER TABLE`, `CREATE INDEX`, `DROP`) | add `WordPress.DB.DirectDatabaseQuery.SchemaChange,WordPress.DB.PreparedSQL.NotPrepared` |
| Bare `$wpdb->query($sql)` where `$sql` is a variable holding a literal | add `WordPress.DB.PreparedSQL.NotPrepared` |
| `$_GET`/`$_POST`/`$_SERVER` reads on admin-list filters | `WordPress.Security.NonceVerification.Recommended` (GET) OR `.Missing` (POST) — pick the exact variant |

**4. No blank lines between the directive and the statement.** A blank line consumes the directive's scope — it applies to the blank line and stops there. Keep the directive immediately above the target.

**5. If you're listing more than 3 different sniffs on one statement, that's a signal.** Consider whether the code itself should be refactored instead. Three or more sniff IDs on one annotation often means the code is doing too much in one place; breaking it up (or rewriting per Rule 19's static-template pattern) usually produces cleaner code *and* eliminates the need to suppress.

**6. Verify file-by-file after each batch.** Running Plugin Check once after touching 20 files and seeing the same warnings reappear wastes time. Iterate in groups of 3–4 files, re-run the sniff locally or on CI, confirm before moving on.

**7. Every suppression needs a per-instance justification.** `-- false positive` alone is not enough. Explain *why* the code is safe and how the static sniff is mis-reading it. Future reviewers need the justification to evaluate whether it still holds after refactors.

**8. `phpcs:enable` is static — control-flow branches do not scope it.** An `enable` placed inside `if`/early-return closes the surrounding `disable` for every line below in the file, not just the branch. If you need to suppress through an early return, either (a) delete the in-branch `enable` and let the outer `enable` close the scope, or (b) split the code into two `disable`/`enable` brackets — one covering the pre-return statement, one covering the post-return statements. *(flagged 2026-04-23 after Plugin Check audit)*

**21. Every plugin PHP file must abort when loaded directly.**
Add `defined( 'ABSPATH' ) || exit;` (or `if ( ! defined( 'ABSPATH' ) ) exit;`) at the very top of every PHP file — main bootstrap, class files, REST handlers, AJAX handlers, template partials, trait files, autoloaded files, include-only helpers. No exceptions. Plugin Check reports `missing_direct_file_access_protection` as an ERROR. A misconfigured web server that serves raw `.php` files from the plugin directory (Apache without mod_php wired correctly, a misrouted nginx `location` block, a file copied to a debug path) will dump file contents to anyone — leaking class structure, SQL templates, and occasionally secrets from development. Cost: one line. Value: zero information disclosure when the server misbehaves. *(flagged 2026-04-22 after Plugin Check audit)*

**Exact shape, no extra condition.** Plugin Check recognises only a top-level `defined( 'ABSPATH' ) || exit;` (or `die`), or an `if ( ! defined( 'ABSPATH' ) ) { exit; }` whose whole condition is the negated `defined()` call. A compound guard such as `if ( ! defined( 'ABSPATH' ) && 'cli' !== PHP_SAPI ) { exit; }` — typically added so a test harness can `require` the file under plain PHP CLI — is reported as `missing_direct_file_access_protection`, even though it still blocks web requests. Keep the plain guard and let the test stand in for WordPress instead:

```php
// tests/example-harness.php — define what WordPress would, BEFORE loading the file.
define( 'ABSPATH', __DIR__ . '/' );
require __DIR__ . '/../includes/class-example.php';
```

A harness that loads a guarded file must also fail on an early stop: an `exit` inside the required file ends the run with status 0 and no output, which a shell runner (`php "$f" || echo FAIL`) scores as a pass. Register a shutdown function that exits non-zero unless the harness reached its end marker. *(tightened 2026-09-11 after Plugin Check report)*

**22. Parameterize LIKE wildcards; never hardcode them inside a prepared query.**
Pass the wildcard pattern as a `%s` parameter built from `$wpdb->esc_like()`. Never write `LIKE 'prefix.%'` inside a `$wpdb->prepare()` template.

```php
// Wrong — Plugin Check flags LikeWildcardsInQuery; and if $prefix is ever user input,
// unescaped % or _ become wildcard injection.
$wpdb->prepare(
    "SELECT * FROM `{$t}` WHERE slug LIKE 'prefix.%%' AND created_at < %s",
    $cutoff
);

// Right — wildcard is a parameter, literal portion is esc_like'd.
$pattern = $wpdb->esc_like( 'prefix.' ) . '%';
$wpdb->prepare(
    "SELECT * FROM `{$t}` WHERE slug LIKE %s AND created_at < %s",
    $pattern,
    $cutoff
);
```

Two reasons. First: `esc_like()` escapes literal `%` and `_` within the prefix so user-supplied prefixes can't inject wildcards. Second: the static sniff can verify a fully-placeholdered query but not a hardcoded wildcard, so hardcoding fails Plugin Check. *(flagged 2026-04-22 after Plugin Check audit)*

**23. `$_SERVER` is untrusted input — treat HTTP_* / REDIRECT_* / REMOTE_* values like `$_GET`.**
Rule 1 lists the obvious sources. `$_SERVER` belongs there too. Any key whose value originates in the HTTP request (`HTTP_*` headers, `REDIRECT_*` from mod_rewrite forwards, `REMOTE_ADDR` behind an untrusted proxy, `QUERY_STRING`, `REQUEST_URI`, `HTTP_REFERER`, `HTTP_USER_AGENT`) is attacker-controllable. Sanitize and `wp_unslash` before use.

```php
// Common Apache/FastCGI fallback for Authorization header passthrough.
// Wrong — raw value assigned to HTTP_AUTHORIZATION for downstream consumers.
if ( ! isset( $_SERVER['HTTP_AUTHORIZATION'] ) && isset( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) ) {
    $_SERVER['HTTP_AUTHORIZATION'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
}

// Right — sanitize + unslash, same as $_POST.
if ( ! isset( $_SERVER['HTTP_AUTHORIZATION'] ) && isset( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) ) {
    $_SERVER['HTTP_AUTHORIZATION'] = sanitize_text_field( wp_unslash( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) );
}
```

*(flagged 2026-04-22 after Plugin Check audit)*

**24. Sanitizer placement must be recognizable to the static sniff.**
Plugin Check's `ValidatedSanitizedInput.InputNotSanitized` sniff does not trace through nested calls beyond one level and does not recognize type casts as sanitizers. Code that is semantically safe but violates these patterns will still be flagged as ERROR. Prefer flat, canonical patterns with a recognized WordPress sanitizer as the outermost wrapper:

```php
// Wrong — (int) cast is not a recognized sanitizer prefix; nested wp_unslash inside trim() inside sanitize_url() defeats the sniff.
$page   = (int) $_GET['paged'];
$url    = sanitize_url( trim( wp_unslash( $_POST['callback_url'] ?? '' ) ) );

// Right — outermost call is a recognized sanitizer; wp_unslash is the inner step; no intermediate helpers.
$page   = absint( wp_unslash( $_GET['paged'] ?? 0 ) );
$raw    = wp_unslash( $_POST['callback_url'] ?? '' );
$url    = sanitize_url( trim( $raw ) );
```

Rule of thumb: read + unslash + sanitize on one or two adjacent lines; the outermost function call must be a recognized WordPress sanitizer (`sanitize_text_field`, `sanitize_email`, `sanitize_url`, `esc_url_raw`, `absint`, `intval`, `sanitize_key`, `wp_kses`, `wp_kses_post`, `sanitize_textarea_field`, etc.). Do not rely on `(int)` / `(string)` / `(bool)` casts alone — they're semantically safe but invisible to the sniff. *(flagged 2026-04-22 after Plugin Check audit)*

**25. JSON input: decode BEFORE sanitizing; sanitize each decoded value, not the raw JSON string.**
`sanitize_text_field` strips line breaks, collapses whitespace, removes certain escape characters, and mangles embedded quotes — all of which corrupt JSON and make `json_decode` return `null` or lose data. The correct order for JSON request bodies is:

1. `wp_unslash` to reverse WordPress's magic-quote emulation.
2. `json_decode( ..., true )` to get an associative array.
3. Type-check the result (must be `is_array`).
4. Sanitize each decoded value according to its expected shape.

```php
// Wrong — sanitize_text_field before decode breaks escape sequences.
$raw     = sanitize_text_field( wp_unslash( $_POST['config'] ?? '{}' ) );
$decoded = json_decode( $raw, true ); // may be null or lossy

// Right — unslash, decode, validate, then sanitize per-value.
$raw = wp_unslash( $_POST['config'] ?? '{}' );
$decoded = json_decode( $raw, true );
if ( ! is_array( $decoded ) ) {
    return new WP_Error( 'invalid_json', 'Expected JSON object' );
}
$clean = array();
foreach ( $decoded as $key => $value ) {
    $pid = absint( $key );
    $amt = absint( $value );
    if ( $pid > 0 && $amt > 0 ) {
        $clean[ $pid ] = $amt;
    }
}
```

This also applies to JSON bodies in REST handlers (`$request->get_json_params()` returns already-decoded values — but if you read raw body via `$request->get_body()`, same rule). *(flagged 2026-04-22 after Plugin Check audit)*

**26. Prefer `wp_delete_file()` over bare or `@`-suppressed `unlink()` for file cleanup.**
Plugin Check flags raw `unlink()` and `@unlink()` as `WordPress.WP.AlternativeFunctions.unlink_unlink`. `wp_delete_file()` is a thin core wrapper that runs `@unlink()` through the `wp_delete_file` filter, so it is a drop-in replacement that passes the sniff. Use it for any filesystem cleanup — temp files from `wp_tempnam()`, stale caches, uninstall residue.

```php
// Wrong — flagged by Plugin Check; forces a phpcs:ignore.
@unlink( $tmp_path );

// Right — WP-idiomatic, filter-aware, no suppression needed.
wp_delete_file( $tmp_path );
```

**Caveat:** `wp_delete_file()` returns `void`. If you need to detect cleanup failure to log it (e.g. diagnosing temp-dir drift or permissions issues), you must keep `@unlink()` with a `phpcs:ignore WordPress.WP.AlternativeFunctions.unlink_unlink -- need return value for debug-only error_log on cleanup failure.` annotation. In practice this is rarely worth the extra suppression — silent cleanup plus occasional orphaned temp files is usually acceptable. *(flagged 2026-04-24 after Plugin Check audit)*

**27. Structured POST/REST maps: sanitize every value, not just the outer container.**
When `$_POST['x']` carries a multi-level array (typical form syntax `x[key][]=val` or fetch-API `FormData` with bracket keys), `(array) wp_unslash( $_POST['x'] )` only unslashes the outer level. The inner-level scalars are still untrusted strings.

Walk the structure with explicit loops, validate each key, validate the shape of each value, and apply a recognized WordPress sanitizer or an allowlist regex to every leaf scalar before using it. Apply the same shape check that JSON bodies get (Rule 25) — the only difference is PHP did the decode for you instead of `json_decode`.

```php
// Wrong — outer cast only; inner scalar values flow into URL concat / SQL / output unsanitized.
$map = (array) wp_unslash( $_POST['option_map'] ?? [] );
foreach ( $map[ $u ] as $v ) { $url .= '&' . $v; }

// Right — walk the structure, validate keys + values, allowlist legal characters.
$raw   = (array) wp_unslash( $_POST['option_map'] ?? [] );
$clean = array();
foreach ( $raw as $k => $vals ) {
    $key = esc_url_raw( (string) $k );
    if ( $key === '' || ! is_array( $vals ) ) {
        continue;
    }
    foreach ( $vals as $v ) {
        if ( preg_match( '/^[A-Za-z0-9_=.\-]+$/', (string) $v ) ) {
            $clean[ $key ][] = (string) $v;
        }
    }
}
```

PHP's `$_POST` parser turns `option_map[key1][]=foo&option_map[key1][]=bar` into a real nested array. The outer `(array) wp_unslash` recursively unslashes magic-quoted strings — but it does not enforce structure, validate keys, or sanitize values. That is your job, the same way it is for `json_decode`'d JSON bodies (Rule 25). The two patterns differ only in who does the decode: PHP for bracket-syntax forms, your code for raw JSON. The trust-no-input + per-value-sanitize discipline is identical.

If the inner values must conform to a specific shape (a known enum, a known character class, a known max length), **validate-not-sanitize**: an allowlist regex or `in_array( $v, $allowed, true )` is stronger than `sanitize_text_field`, which only strips a few specific patterns and lets through values that pass-the-strip but still don't belong. This matters more for structured maps than for flat scalars, because the per-leaf trust budget is multiplied across every key/value the operator can submit. *(flagged 2026-05-15 after wp-compliance audit during a structured-POST-map-sanitization audit)*

**28. Normalize line endings before Plugin Check/release.**
Plugin Check reports `Internal.LineEndings.Mixed` when a file contains both CRLF and LF line endings. Treat this as a release-blocking hygiene issue, not a false positive. After touching plugin PHP/readme/assets, run a line-ending check on changed files and normalize each affected file to one style before claiming Plugin Check is clean. This especially matters after edits from mixed tools (PowerShell, patch tools, IDEs) because `php -l` and JS syntax checks can still pass while Plugin Check warns. *(flagged 2026-06-29 after Plugin Check report)*

**29. Hook callbacks take `mixed` parameters — never a non-nullable scalar or array type.**
A hook callback is not a private method. WordPress hands it whatever the *caller* passes, and the caller is often core code reading a value out of an array or object that **some other plugin wrote**. An absent key or property arrives as `null`. Declare that parameter `string` (or `int`, `float`, `bool`, `array`) and PHP throws an **uncaught `TypeError`** — a hard fatal, not a warning.

```php
// Wrong — the docblock in core says "string", so this looks safe.
add_filter( 'some_core_filter', array( $this, 'handle' ), 10, 4 );

public function handle( mixed $short_circuit, string $target, mixed $context, array $extra ): mixed {
    if ( false !== $short_circuit || ! $this->is_mine( $target, $extra ) ) {
        return $short_circuit;
    }
    // …
}

// Right — accept mixed, normalize in the body, hand back untouched whatever you do not own.
public function handle( mixed $short_circuit, mixed $target, mixed $context, mixed $extra ): mixed {
    $target = is_string( $target ) ? $target : '';
    $extra  = is_array( $extra ) ? $extra : array();
    if ( false !== $short_circuit || '' === $target || ! $this->is_mine( $target, $extra ) ) {
        return $short_circuit; // core's own guard produces a better error than ours would
    }
    // …
}
```

Five things make this worse than an ordinary type bug:

1. **A core `@param string` docblock is documentation, not a contract.** Core does not validate the value before `apply_filters()`. It passes what it has, including `null` from an undefined array key or object property.
2. **PHP's coercive mode does not rescue you.** Passing `null` to a non-nullable parameter of a *user-defined* function is a `TypeError` whether or not `declare(strict_types=1)` is set. The usual "PHP will just cast it" intuition is wrong here.
3. **Your callback runs for everyone's data, not just yours.** Filters that sound product-specific ("download this package", "prepare this item") fire on every item of that kind on the site. One malformed record written by an unrelated plugin reaches your callback.
4. **Core usually tolerates what you reject.** Core's own code path typically guards with `empty()` / `is_array()` and degrades to an error object. By throwing where core would have shrugged, a callback converts a harmless skipped operation into a site-wide fatal.
5. **The blast radius is not your screen.** Callbacks on update, cron, and scheduled-task hooks run inside routines that enable maintenance mode, take a lock, or hold a transient before calling you and release it after. A fatal in the middle skips the release — leaving a stuck maintenance flag, a stale lock, or an unfinished batch. The user sees a site that is down, with nothing pointing at your plugin except a line in the PHP error log.

**Apply it to every registered callback**, `add_action` as well as `add_filter`, including the ones core "always" calls correctly — `array $links`, `string $file`, `array $response` are all the same bet. The body is where types get enforced: `is_string()`, `is_array()`, `absint()`, a cast, or an early `return $value` for anything you do not recognize. A filter must always return something; returning the original value unchanged is the correct answer for input you do not own.

**Falsification test, mandatory for every hook callback:** call it directly with `null` in each parameter position, with the other arguments shaped exactly as the caller shapes them, and assert it returns the unmodified first argument instead of throwing. Pass the real values the caller passes — a test that only ever hands the callback well-formed arguments proves nothing about the case that takes sites down. If a guard clause exists specifically to absorb a malformed value, break the guard deliberately and confirm the test goes red before shipping it. *(flagged 2026-09-22 after a production incident: a non-nullable `string` parameter on an update-related filter turned another plugin's package-less update record into a fatal inside the scheduled auto-update run, leaving affected sites stuck behind a maintenance page.)*

---

### 6 — Compatibility & Release

**30. Verify the declared minimum PHP version — do not assume it.**
`Requires PHP` in the plugin header is a promise. Syntax newer than that version is a fatal error on older PHP, usually on the first request that autoloads the class rather than at activation, so the plugin appears to install fine. Common offenders: `readonly` properties, enums, `never` and first-class callables (8.1); `true`/`null`/`false` as standalone or union types with `true`, readonly classes (8.2); typed class constants (8.3).

```php
// Wrong for Requires PHP: 8.0 — both lines are fatal on 8.0.
public function __construct( private readonly string $api_key ) {}
public function run(): true|\WP_Error { /* … */ }

// Right — identical behavior on 8.2+, and it loads on 8.0.
public function __construct( private string $api_key ) {}
public function run(): bool|\WP_Error { /* … */ }
```

Verify it two ways, because each misses what the other catches:
1. **Static:** PHPCompatibility **10.x** over every shipped file (`--runtime-set testVersion 8.0-`). The last stable release, 9.3.5, predates PHP 8.1 and reports none of the features above.
2. **Runtime:** run the test suite on the minimum PHP version in CI. Pin dev dependencies to it (`composer config platform.php 8.0.30`), or `composer install` itself fails there.

If the code genuinely needs newer PHP, raise the header rather than the code. *(flagged 2026-09-26 after a plugin declaring PHP 8.0 was found to fatal on 8.0 and 8.1)*

**33. Content hashes in tests must not depend on line endings.**
Rule 28's second trap. A test that pins `hash( 'sha256', file_get_contents( $file ) )` passes on the machine that computed it and fails wherever git checks the file out with other line endings (`core.autocrlf` gives CRLF on Windows; CI gets LF). Normalize before hashing. If the existing pins were computed from CRLF, normalize to CRLF so every pinned value stays valid without rewriting it:

```php
private static function as_crlf( string $src ): string {
	return str_replace( "\n", "\r\n", str_replace( "\r\n", "\n", $src ) );
}
```

Add `.gitattributes` with `* text=auto eol=lf` so the repository stays consistent. *(flagged 2026-09-26 after a fingerprint test passed on Windows and failed on Linux CI)*

**34. Write readme.txt headers the way the directory parses them.**
The WordPress.org readme parser and Plugin Check validate these; the plugin page shows whatever you write, so a wrong value can look accepted and still fail the check.

- `Tested up to:` major version only (`6.8`, not `6.8.1`). Plugin Check reduces the latest WordPress release to its major version and reports a patch number as `invalid_tested_upto_minor`, an error.
- `Stable tag:` identical to the plugin header `Version:`.
- `Contributors:` WordPress.org **usernames** (the slug in `profiles.wordpress.org/<username>/`), not display names.
- Short description at most 150 characters. Each section at most 2,500 **words** (FAQ and Changelog 5,000); unknown sections such as External services are merged into Description and count against it.
- `License:` must normalize to the same identifier as the plugin header (`GPL-2.0-or-later` and `GPLv2 or later` both normalize to `GPL2`).
- `Text Domain` equals the plugin slug: lowercase letters, digits and hyphens only.
- At most 5 tags; later ones are ignored.

Check with the directory's readme parser before release, not by eye. *(flagged 2026-09-26 after WordPress.org compliance audit)*

---

## Safe Default Order

Every WordPress action should follow this sequence:

```
validate input → sanitize when needed → check capability → verify nonce → perform action safely → escape output late
```

---

## Quick Release Checklist

Before releasing or committing, confirm you are NOT:

- [ ] Shipping any PHP file without a plain ABSPATH guard at the top (no extra condition — a CLI exception for tests fails Plugin Check)
- [ ] Echoing raw data anywhere
- [ ] Using request values in SQL
- [ ] Hardcoding LIKE wildcards inside a prepared query
- [ ] Saving settings without capability + nonce checks
- [ ] Sanitizing raw JSON before `json_decode` (corrupts the payload)
- [ ] Outer-cast-only sanitization on structured POST/REST maps (inner scalars left untrusted)
- [ ] Reading `$_SERVER` HTTP_*/REDIRECT_*/REMOTE_* values without sanitize + wp_unslash
- [ ] Exposing debug pages or logs
- [ ] Trusting uploads, remote URLs, or API responses
- [ ] Relying on sanitization alone instead of validation + escaping
- [ ] Ignoring Plugin Check warnings without justification
- [ ] Typing a hook callback parameter as non-nullable `string`/`int`/`array` instead of `mixed` + a check in the body
- [ ] Shipping files with mixed CRLF/LF line endings (`Internal.LineEndings.Mixed`)
- [ ] Declaring a `Requires PHP` that PHPCompatibility 10 and a test run on that PHP version have not verified
- [ ] Contacting an external service before the user opts in, or an External services section that does not match the real payloads
- [ ] Wildcard-deleting, on uninstall, an option prefix another component shares
- [ ] Pinning file hashes in tests without normalizing line endings
- [ ] A `Tested up to` with a patch number, or readme headers not checked with the readme parser

---

## When Reviewing a Plugin Check / PHPCS Report

When the user provides a list of Plugin Check, PHPCS, or other static-analyzer errors and asks you to address them:

1. **Triage every error against the numbered rules** to classify it as:
   - **Real bug** — fix per the relevant rule.
   - **False positive** — annotate with `phpcs:ignore Sniff.Name -- reason` per Rule 20. Include the justification inline.
   - **Out of scope** — doc/license/branding or non-security issues the user explicitly excluded; skip.

2. **Fix the real bugs.** Prefer the smallest surgical edit. Run the test suite after each logical batch to catch regressions.

3. **Run a meta-check against the skill itself.** After triage, ask:
   - Is any existing rule written too loosely? A concern that *should* have been caught by Rule N but the wording left ambiguity → tighten Rule N.
   - Is there a recurring error category not cleanly covered by any rule? → new rule worth adding.
   - Is there a false-positive pattern seen more than once? → add an example to Rule 20's list.

4. **End the report with a short status line as a bullet list** summarizing: how many valid errors were fixed, how many were annotated as false positives, how many skill-level changes surfaced. Ask the user whether to append/tighten the skill. Example:

   > - **17** valid errors fixed across 6 commits
   > - **41** false positives annotated with `phpcs:ignore` + justification
   > - **2** new rules worth adding:
   >   - ABSPATH guard on every PHP file
   >   - `$_SERVER` as untrusted input
   > - **1** existing rule to tighten:
   >   - Rule 6 should name LIKE wildcards explicitly
   >
   > Append to skill now? (local-only by default; remote push only on explicit YES)

5. **NEVER auto-apply skill changes.** No matter how obvious the new rule seems, always ask for explicit user confirmation before editing `SKILL.md`. The user may want to tweak wording, scope it differently, or decline entirely. An unsolicited skill edit is a policy change without review.

6. **Local-commit default; remote push requires explicit YES.** If the user says "yes, add it" or similar, that authorizes only the local file edit + local commit. Pushing to any remote (GitHub mirror, compliance backup, team fork) requires a separate explicit YES — this skill lives on a public repo and every push is public record.

7. **Sanitize every example you add to the skill before writing it to disk.** The skill file is publicly shared. When adding rules, examples, checklist items, or appendix entries:
   - **No project names** — use "my plugin", "the plugin", "your plugin".
   - **No real table names** — use `my_plugin_table`, `{$t}`, `{$prefix}_my_table`.
   - **No real file paths** — use `includes/class-example.php`, `admin/class-settings.php`.
   - **No commit SHAs, PR numbers, branch names, or tag names.**
   - **No customer identifiers, user IDs, API keys, token shapes, endpoint URLs, domain names, or internal service secrets.**
   - **No direct quotes from proprietary code** — rewrite as a generic pattern that illustrates the same concept.
   - **Date-stamp the source only generically** — `*(flagged 2026-04-22 after Plugin Check audit)*` is fine; `*(flagged during the XYZ Corp audit)*` is not.

   Before saving the edit, re-read every example and checklist line and strip anything that identifies a specific project, repo, customer, or private system.

This closes the feedback loop so the skill improves with each real-world audit instead of staying frozen. The meta-check is mandatory — do not hand back a "done" report without it.

---

## Appending New Rules

When the user identifies a new security concern or coding issue:

1. Add it as a numbered rule (continue the numbering: 19, 20, …)
2. Place it under the most appropriate category above
3. Update the pre-code checklist if the new rule warrants a mandatory check
4. Update the quick release checklist if it applies at review time
5. Note the source (e.g., "user flagged 2026-04-10")
