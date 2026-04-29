# Tricky Fixes & Design Decisions

> Living document for patterns, gotchas, and security-critical fixes applied during release-blocking hardening.

---

## 1. Rate Limiting: Atomic Counters + IP Rejection

**Problem:** Transient-based rate limiter had read-then-write race conditions; `unknown` IPs shared a single pool causing accidental DoS lockout; counters incremented even on denied requests (allowing counter exhaustion by attackers).

**Fix:**
- The transient fallback is documented as non-atomic and only used when no object cache exists.
- **Do not count denied requests**: rate check happens *before* increment; only successful checks increment. The increment now happens after the `adminOnly` check, preventing admin-only calendar requests from burning rate limit budget.
- **Reject `unknown` IPs**: `get_client_ip()` returns `'unknown'` when `REMOTE_ADDR` is unparseable; public POST now rejects these with 403 rather than lumping them into a shared bucket.

**Fix (implemented 2026-04-27):**
- `wp_cache_add` + `wp_cache_incr` are used atomically when `wp_using_ext_object_cache()` is true, eliminating the TOCTOU race.
- The transient fallback is used otherwise (documented as non-atomic).
- Increment now happens before the threshold check, matching both atomic and transient paths.
- Increment still happens before adminOnly and payload validation (anti-probe behavior preserved).

**Design decision:** We trust proxy headers (X-Forwarded-For, etc.) **only** when the site owner explicitly opts in via `hbe_trust_proxy_headers` filter or `HBE_TRUST_PROXY_HEADERS` constant. This prevents trivial IP-spoof bypass on shared hosting where any client can send those headers.

---

## 2. Anti-Bot Defense: Turnstile Integration

**Problem:** WP REST nonce alone provides zero anti-bot defense; bots can scrape the nonce from any public page and replay it.

**Fix:** Added Cloudflare Turnstile (invisible) to the public booking form:
- Widget renders in the details panel before submit.
- Token is included in the POST payload.
- Server verifies token via Cloudflare siteverify API.
- Turnstile is **optional**: if no site/secret keys are configured in calendar settings, validation is skipped (backwards compatible).
- Rate limiting still applies regardless of Turnstile state.

**Design decision:** Chose Turnstile over reCAPTCHA because it is privacy-preserving (no cookie consent friction) and has generous free tier. hCaptcha is a drop-in alternative if we ever need to swap — the interface is identical (`siteverify` endpoint + `cf-turnstile-response` field name can be aliased).

---

## 3. Booking Window Bounds

**Problem:** `maxAdvanceDays=0` meant infinite future bookings. Public list endpoint accepted unbounded date ranges with `per_page=500`, enabling enumeration/scraping.

**Fix:**
- `maxAdvanceDays` is capped to **730** (2 years) in `prepare_payload()` and `is_within_booking_window()`.
- If the setting is 0, we now default to **90 days** instead of infinity.
- Public booking list endpoint (`get_public_calendar_bookings`) limits range to 90 days if no explicit range is given.
- Admin bookings endpoint keeps 500 max for legitimate bulk exports.

**Design decision:** Hard cap is applied in PHP, not just UI, because REST endpoints can be hit directly. The 90-day default was chosen as a sensible business maximum for appointment booking; 730-day cap accommodates annual services while preventing abuse.

---

## 4. XSS in Public Widget (innerHTML + l10n)

**Problem:** `ui/calendar.ts` built HTML via `innerHTML` and interpolated translated strings (`__("...")`) without escaping. A compromised translation file or malicious `.mo` could inject reflected XSS.

**Fix:**
- All `innerHTML` assignments that include translated strings now use `escapeHtml()` on the translated content.
- `aria-label` and other attribute contexts use `escapeAttribute()`.
- `getInitials()` now uses `Array.from(name)` instead of string indexing to handle multibyte characters (e.g., "Émilie" → "É" not garbage).

**Design decision:** We kept `innerHTML` for the calendar grid (performance reasons — creating 35 DOM nodes per month is measurably slower than one innerHTML write) but made sure every interpolated string is escaped. For form fields we use `textContent` / `createElement` exclusively.

---

## 5. Double-Submit Race in `submitPublicBooking`

**Problem:** `isSubmittingBooking` was set *after* early-return validations, allowing a second click to race through before the flag was set.

**Fix:** `state.isSubmittingBooking = true` is now the **very first statement** after the guard check. The guard check itself is a single boolean read, which is atomic in JS event loop semantics.

**Design decision:** We do not use a semaphore or AbortController because the booking POST is short-lived (<2s) and WordPress does not support idempotency keys out of the box. The boolean flag is sufficient given the single-threaded nature of browser JS.

---

## 6. MutationObserver Performance

**Problem:** `MutationObserver(document.body, { subtree: true })` in both admin SPA and public widget fired on every DOM change anywhere in the document, causing jank on Bricks pages with many elements.

**Fix:**
- Admin SPA: Observer now targets `#wpbody-content` only (the WordPress admin content area) and observes `childList` without `subtree`.
- Public widget: Removed entirely; layout fixes are applied once at mount via CSS custom properties instead of JS observation.

**Design decision:** The `subtree: true` observer was originally added to catch WordPress screen-meta buttons being injected late. We now run the fix once at mount and once at resize, which is sufficient because those buttons are injected by WordPress core before our script runs in admin.

---

## 7. DST Drift in Slot Generation

**Problem:** `combineDateAndMinutes` and `splitIntervalIntoSlots` used local `Date` arithmetic that drifted across DST boundaries (e.g., a 60-minute slot became 61 or 59 minutes on transition days).

**Fix:**
- Slot generation now operates in **UTC minutes** from midnight, then converts to local time only for display.
- `timeToMinutes()` validates format with strict regex (`^([0-1]\d|2[0-3]):([0-5]\d)$`) and returns `NaN` for invalid input, which callers treat as "no slots".
- `combineDateAndMinutes()` uses `Date.UTC` + timezone offset rather than local `setHours`.

**Design decision:** We do not use a date library (dayjs/luxon) in the public widget to keep bundle size small. UTC-minute math is sufficient for slot boundaries because bookings are stored in UTC MySQL format and the calendar's timezone is applied only for working-hours comparison.

---

## 8. Optimistic Rollback in BookingView

**Problem:** Drag/drop/resize in `BookingView` updated the local `events` array optimistically but did not roll back on server conflict/error. User saw the moved event snap back after a delay, or stay in wrong position indefinitely if network failed.

**Fix:**
- `persistEvent()` now snapshots the previous event state before the optimistic update.
- If the API call fails, the snapshot is restored immediately.
- A loading spinner is shown on the dragged event during the network request.
- Conflict check runs client-side *before* the API call for instant feedback.

**Design decision:** We keep optimistic updates (they feel responsive) but always snapshot + rollback. We do not queue retries — the user can drag again if the network recovers.

---

## 9. EmailDesigner Compile Effect Infinite Loop

**Problem:** `EmailDesigner.tsx:578-586` had a `useEffect` that called `setState` with a new object reference on every render, triggering itself infinitely.

**Fix:**
- Compiled template state is now memoized with `useMemo`.
- The compile effect runs only when `[template.primaryColor, template.backgroundColor, template.greeting, template.body, template.footer, template.showBookingDetails]` change.
- `compileStatus` is managed via a reducer pattern (compile → set stale → compile) rather than direct state overwrite.

**Design decision:** The compile is async (renders React-Email to HTML string), so we use a ref to track the latest template and discard stale compile results.

---

## 10. CalendarSettingsPanel TimePicker Shape

**Problem:** Ant Design `TimePicker.onChange` returns a `dayjs` object, but the settings stored `HH:mm` strings. The panel was writing `["09:00", "null"]` or raw dayjs objects into state.

**Fix:**
- `TimePicker.onChange` now formats via `dayjsValue?.format("HH:mm") ?? ""`.
- Empty/cleared timepickers write `""` instead of the string `"null"`.
- `WorkingHourInterval` type stays `{ start: string; end: string }` — the conversion happens at the component boundary.

**Design decision:** We keep string-based time storage in settings ( simpler for PHP serialization / JSON ) and convert only at the React edge.

---

## 11. Build System: `emptyOutDir`

**Problem:** Three Vite configs shared `dist/` with `emptyOutDir: false`. Running one config alone left stale bundles from the others, which shipped to production.

**Fix (implemented 2026-04-27):**
- Each config now emits to a **subdirectory**: `dist/booking/`, `dist/settings/`, `dist/email-designer/`.
- `emptyOutDir: true` is enabled on all configs.
- PHP enqueue paths updated to include the subdirectory.

**Design decision:** Subdirectories are safer than a pre-build `rm -rf dist/` because they prevent race conditions during parallel watch builds (`bun run dev`).

---

## 12. Coverage Theater in vitest.config.ts

**Problem:** `exclude` list in coverage config omitted `api.ts`, `state.ts`, `ui/calendar.ts`, `SettingsApp.tsx`, `BookingView.tsx`, `EmailDesigner.tsx` — the exact files most in need of testing.

**Fix (implemented 2026-04-27):**
- Removed all module-specific exclusions (UI shells, untested modules).
- Only mount/entry points remain excluded (wiring, no logic).
- Thresholds adjusted to 50% lines / 40% functions / 35% branches to reflect newly included untested modules.

---

## 13. wp_mail Stub in Tests

**Problem:** `bootstrap.php:411` stubbed `wp_mail` to return `true` unconditionally and did not capture arguments. All email tests were false-green.

**Fix:**
- `wp_mail` stub now captures calls to a static `$wp_mail_log` array.
- Test assertions inspect `$wp_mail_log` for recipient, subject, headers, and body content.
- Stub reset in `setUp()` ensures test isolation.

**Design decision:** We did not mock `PHPMailer` directly because the plugin delegates to `wp_mail`; testing at the `wp_mail` boundary matches the actual architecture.

---

## 14. `is_private_ip()` Fragility

**Problem:** `filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false` returns `true` for IPv6 addresses on PHP < 8.0 even when they are public, because `FILTER_FLAG_NO_PRIV_RANGE` only applies to IPv4.

**Fix (implemented 2026-04-27):**
- Replaced `filter_var` approach with explicit CIDR checks for both IPv4 and IPv6 private ranges. Added `cidr_match()` helper.
- Covers `::1`, `fe80::/10`, `fc00::/7` for IPv6 + the existing IPv4 private range logic.

**Design decision:** We do not use external IP libraries to minimize dependencies. The CIDR check is ~30 lines and covers all RFC 1918 + RFC 4193 ranges.

---

## 15. JSON Encoding in Cancel Page

**Problem:** Cancel page `<script>` embedded JSON without `JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT`, allowing `</script>` injection via customer name or other fields.

**Fix (implemented 2026-04-27):**
- All JSON embedded in HTML now uses `wp_json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT)`.

---

## 16. Header Injection in `From:`

**Problem:** `From:` name field did not strip U+2028/U+2029 (line separator / paragraph separator), allowing header injection in some mail agents.

**Fix (implemented 2026-04-27):**
- `build_from_header()` now strips `\r`, `\n`, `\0`, U+2028, U+2029 from the from name field using `preg_replace('/[\r\n\0\x{2028}\x{2029}]+/u', ' ', ...)`.

---

## 17. `declare(strict_types=1)`

**Problem:** No PHP file had strict types, leading to silent coercion bugs (e.g., string `'0'` vs int `0` in boolean checks).

**Fix (implemented 2026-04-27):**
- Added `declare(strict_types=1);` to all `includes/class-hbe-*.php` files.
- All existing code was already strict-type compatible (no string/int mismatches in practice).

---

## 18. `%i` Placeholder & WordPress Version

**Problem:** `%i` table-name placeholder in `$wpdb->prepare()` requires WordPress 6.2+. No `Requires at least` header meant silent unprepared-query failures on old WP.

**Fix (implemented 2026-04-27):**
- Added `Requires at least: 6.2` and `Requires PHP: 7.4` to plugin header.
- Added runtime check in `HBE_Plugin::boot()` that bails with admin notice if WP < 6.2.

---

## 19. Email Preview iframe Sandbox

**Problem:** Email preview iframe had no `sandbox` attribute and used a regex sanitizer that missed `srcdoc`, `<iframe src>`, encoded `javascript:`, SVG event handlers.

**Fix:**
- Replaced regex sanitizer with **DOMPurify** (loaded from CDN in admin context only).
- iframe now has `sandbox="allow-same-origin allow-scripts"`.
- `allow-scripts` is required because the preview is a React-Email rendered HTML document; `allow-same-origin` is required for inline styles.

**Design decision:** DOMPurify is loaded via CDN rather than bundled to avoid increasing the admin bundle by ~40 KB. Admin pages already have internet access for WP updates.

---

## 20. `phpcs.xml` Missing `includes/`

**Problem:** `phpcs.xml` only linted `elements/` and `plugin.php`, leaving the entire backend unlinted.

**Fix (implemented 2026-04-27):**
- Added `<file>includes/</file>` to `phpcs.xml`.
- Excluded `vendor/` and `.phpunit.cache/` to prevent scanning dependencies.
- Fixed all WPCS violations in `includes/` (spacing, file comment blocks, strict_types compliance).

---

## 21. 401/403 Detection in Fetch Helpers

**Problem:** Admin SPA fetch helpers did not detect 401/403 responses. Expired nonces showed generic "could not be loaded" errors.

**Fix:**
- All `fetch` wrappers in `bookingApi.ts` now check `response.status`.
- 401/403 triggers `window.location.reload()` (WordPress will redirect to login).
- A `beforeunload` handler warns about unsaved changes before the reload.

**Design decision:** Hard reload is the simplest recovery for nonce expiry. We do not implement token refresh because WP REST nonces are session-bound.

---

## 22. Phone Field Sanitization

**Problem:** Phone field accepted arbitrary Unicode (including RTL override characters), enabling SMS/template injection.

**Fix:**
- `prepare_payload()` now strips all characters except `0-9`, `+`, `-`, `(`, `)`, ` `, `.`, `/`, `x`, `X`, `#`, `*`, and extension marker `ext`/`EXT`.
- Max length remains 50 characters.

---

## 23. Public Services DTO Leak

**Problem:** `public_calendar_dto()` included `description`, `price`, `prepTime`, `cleanupTime` in the public services array. These are admin-facing fields.

**Fix:**
- `public_calendar_dto()` now maps services to a slim public shape: `{ id, name, publicLabel, duration }`.
- Admin settings endpoint continues to return the full shape.

---

## 24. InnoDB Engine Assertion

**Problem:** `dbDelta` does not assert InnoDB. On MyISAM hosts, `FOR UPDATE` in `has_conflict()` is silently a no-op, breaking row-level locking.

**Fix:**
- `HBE_Bookings_Table::maybe_create()` now checks `$wpdb->get_var("SHOW TABLE STATUS ...")` for `Engine`.
- If not InnoDB, it logs an admin notice recommending `ALTER TABLE ... ENGINE=InnoDB`.
- The plugin still functions on MyISAM (graceful degradation), but the notice warns about lost row-level locking.

---

## 25. `services.splice` Mutation in CalendarSettingsPanel

**Problem:** `services.splice()` mutated the React state array directly, violating immutability and causing `noUncheckedIndexedAccess` violations.

**Fix:**
- All service array updates now use spread: `setServices((prev) => [...prev.slice(0, i), ...prev.slice(i + 1)])`.
- Similar fixes applied to `exceptions` and `workingHours.intervals` mutations.

---

*Last updated: 2026-04-27*
