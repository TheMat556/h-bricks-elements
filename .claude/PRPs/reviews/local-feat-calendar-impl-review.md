# Local Code Review — `feat/calendar-impl`

**Reviewed:** 2026-04-20
**Branch:** `feat/calendar-impl` → `master` (4 commits ahead, uncommitted WIP)
**Scope:** 13 modified files, ~4,371 insertions / ~1,105 deletions, plus 4 untracked paths
**Decision:** **BLOCK** — 1 CRITICAL + multiple HIGH issues must be fixed before merge.

---

## Summary

The calendar feature is functionally ambitious and well-scaffolded (solid `$wpdb->prepare` hygiene, strict REST `args`/`permission_callback` wiring, typed response DTOs, hand-rolled HTML escaping, `prefers-reduced-motion` in CSS). However, three systemic issues must block merge:

1. **SMTP credentials leak via a public, unauthenticated REST endpoint** and are round-tripped in plaintext through the admin UI.
2. **No rate-limit / abuse controls on the public booking endpoint**, which now triggers `wp_mail()`. That is an open email-abuse vector.
3. **No tests, and multiple files exceed the 800-line ceiling by 1.5×–3.5×** — the code is landing in a shape that is hard to refactor safely.

Secondary, widespread issues: fragile `innerHTML` templating in the public widget, god-component `SettingsApp.tsx` (1,765 LOC with 22 useState + 12 useEffect), 100+ `!important` CSS declarations overriding AntD and WP admin chrome, no `X-WP-Nonce` on public POSTs, hardcoded English strings in the public widget despite i18n infra on the admin side.

---

## Findings

### CRITICAL

#### C1. SMTP password exposed via public REST endpoint
- **Where:** `includes/class-hbe-rest.php:555-570` (`get_public_calendar`) returns `HBE_Calendar_Settings::get( $id )` in full. That settings object includes `mailSettings.{host, port, encryption, username, password}` (see `includes/class-hbe-calendar-settings.php:186-190, 315`).
- **Impact:** Any anonymous visitor can `GET /wp-json/hbe/v1/public/calendars/{id}` and retrieve the SMTP host/username/password. Immediate credential disclosure.
- **Aggravating:** Admin settings GET (`class-hbe-rest.php:332-388`) also echoes the password back to the client on every settings load. The password is persisted as plaintext post meta and re-sent in clear on every admin refresh.
- **Fix:**
  1. Build a `public_calendar_dto()` that whitelists only the fields the public widget needs: `title`, `icon`, `services[{ id, publicLabel, duration, price, description }]`, `workingHours`, `exceptions`, `publicBooking`, `selectionMode`, `slotSettings`. Never include `mailSettings`, `adminOnly`, internal identifiers.
  2. In admin GET, replace `mailSettings.password` with `hasPassword: boolean` and require re-entry on save; or return a masked sentinel and preserve stored password when the UI round-trips the mask.
  3. Encrypt the stored password at rest using a key derived from `AUTH_KEY` / `SECURE_AUTH_KEY` (WP's standard pattern for sensitive post meta).

---

### HIGH

#### H1. No rate limiting / honeypot on public booking POST (email-abuse vector)
- **Where:** `class-hbe-rest.php:232-247` — `create_public_calendar_booking` is `permission_callback => '__return_true'` and now triggers `HBE_Plugin::send_booking_confirmation()` via `class-hbe-rest.php:660`.
- **Impact:** Anonymous caller controls the recipient email, can create unlimited DB rows, and turns the site into a low-volume spam relay (attacker-controlled `to` + mildly attacker-controlled body).
- **Fix:** IP+calendar transient throttle (e.g., 5 requests / 10 min / IP), add a honeypot field, embed a short-lived per-page nonce in the element markup and validate it (friction only, not CSRF).

#### H2. `send_test_mail` accepts arbitrary recipients (phishing-from-domain abuse)
- **Where:** `class-hbe-rest.php:685-730`. Admin-gated, but if any admin account is compromised (or any admin XSS/CSRF exists anywhere in WP), this endpoint lets the attacker send arbitrary emails from the site's configured "from" address.
- **Fix:** Restrict `to` to `wp_get_current_user()->user_email` or a small admin allowlist. Also reject empty / invalid email post-sanitize: `sanitize_email` returns `''` silently — add `is_email()` guard (`class-hbe-rest.php:692`).

#### H3. `$phpmailer->ErrorInfo` returned verbatim to the client
- **Where:** `class-hbe-rest.php:720-727`. Leaks SMTP server hostnames, auth modes, and occasionally credential hints into the browser console and response logs.
- **Fix:** `error_log( $phpmailer->ErrorInfo )` server-side behind `WP_DEBUG`, return a generic localized message to the client.

#### H4. SMTP host is not validated — SSRF / internal-network probing
- **Where:** `class-hbe-plugin.php:55-67` and `class-hbe-calendar-settings.php:311`. `mail.host` is only `sanitize_text_field()`, then passed straight to PHPMailer. Combined with H2 an admin (or compromised admin) can probe `127.0.0.1`, `10.x.x.x`, `169.254.x`, cloud metadata endpoints, etc.
- **Fix:** Allowlist hostname format + reject private/loopback ranges before assigning to `$phpmailer->Host`.

#### H5. SMTP static state not reset on exception (`set_smtp_context` leak)
- **Where:** `class-hbe-plugin.php:30, 41-69`. `self::$smtp_calendar_id` is reset after `wp_mail()`, but if `wp_mail()` throws or an earlier filter short-circuits, the reset never runs — subsequent `wp_mail()` calls in the same request (password reset, admin notification) route through the customer's SMTP server.
- **Fix:** Wrap in `try { ... } finally { self::set_smtp_context( 0 ); }`. Better: register a self-unregistering closure for `phpmailer_init` instead of relying on static state.

#### H6. Public widget has **zero** i18n despite admin i18n infrastructure
- **Where:** `elements/booking/src/booking.ts` — hundreds of hardcoded English strings (`"Loading"`, `"Select a date"`, `"Continue to Date"`, `"Back to Calendar"`, `"Booking summary"`, `${minutes} minute meeting`, etc.) Meanwhile, admin UI uses a `tr()` helper with a German dictionary in `i18n.ts`.
- **Impact:** Customers see English even when admin UI was localized for them.
- **Fix:** Prefer the idiomatic WP path — `wp_set_script_translations()` on the PHP side, consume `@wordpress/i18n` `__` / `_n` / `sprintf` on the client. Alternatively, move `i18n.ts` to `lib/` and share with the public bundle. Hydrate locale via PHP.

#### H7. Every `fetch` in the admin+public code crashes on non-JSON errors
- **Where:** `BookingView.tsx:346, 375, 405, 437`; `SettingsApp.tsx:381, 404, 431, 470, 504`; `CalendarSettingsPanel.tsx:428`; `booking.ts:307, 741, 811`. Pattern: `const data = await response.json(); if (!response.ok) throw new Error(data?.message)`. A 502/504/HTML page throws `SyntaxError: Unexpected token '<'…` and surfaces that to the user instead of the intended error.
- **Fix:** Shared request helper — `const text = await response.text(); const data = safeJsonParse(text);` then check `response.ok`. Eliminates ~15 lines × 12 call sites of duplication.

#### H8. `booking.ts` `innerHTML` templating is a sustained XSS footgun
- **Where:** `booking.ts` — a 2,811-line vanilla-TS file that rebuilds the widget DOM by string-concatenating ~40 `innerHTML` templates. The only defense is a 5-line hand-rolled `escapeHtml` / `escapeAttribute`. Any future refactor that forgets a single interpolation becomes stored XSS.
- **Fix:** Either (a) switch to `document.createElement` + `textContent` builders returning `DocumentFragment`, or (b) adopt preact (~4 KB gzipped) and eliminate the class of defect. At a minimum add a Biome/ESLint rule forbidding `innerHTML =` outside a marked-safe helper, plus XSS regression tests that feed `<img src=x onerror=alert(1)>` into every admin free-text field.

#### H9. `window.__hBricksNewBooking` global bridges parent ↔ child (racy)
- **Where:** `BookingView.tsx:707-717`. Uses a window global to let the toolbar in `SettingsApp.tsx:1466` open the child's new-booking modal. The effect re-runs on every change to `openNewBooking` / `selectedDate` — cleanup deletes the global, then the new write replaces it. Clicks during the gap do nothing.
- **Fix:** Lift `openNewBooking` into a context provider, or move the toolbar into `BookingView` / pass it as a prop. Window globals are never the right bridge between sibling React components.

#### H10. Unbounded `MutationObserver` on `document.body { subtree: true }`
- **Where:** `SettingsApp.tsx:931-954`. Fires on every AntD portal, modal, tooltip, and select-dropdown mutation. Each callback runs DOM reads + writes (`applyWordPressLayoutHeightFix`) which triggers more mutations. Classic layout-thrash loop during heavy AntD interaction (week view, modals).
- **Fix:** rAF-coalesce the callback behind a dirty flag, narrow the target to `#wpbody`, and filter by mutation type. Move the `!important` inline style patches (`SettingsApp.tsx:140-202`) into `SettingsApp.css` so the observer is unnecessary in the first place.

#### H11. No request cancellation / stale-response guard on fast navigation
- **Where:** `BookingView.tsx:643-647` — `fetchRange` depends on `selectedDate`, each `onNavigate` re-fires `loadBookings`. No `AbortController`, no stale-response drop. Three fast clicks race, the last response wins regardless of which date range the user is currently on.
- **Fix:** Adopt TanStack Query / SWR (strongly recommended, see M1), or minimally wire `AbortController` + generation counter.

#### H12. SettingsApp.css has 61 `!important`; admin page CSS restyles all of wp-admin
- **Where:** `SettingsApp.css` (61 `!important`), `BookingCalendar.css` (30), `class-hbe-admin.php:143-194` (`#wpcontent`, `#wpbody-content`, `#wpfooter` targeted with `!important` inline CSS enqueued onto the WP admin chrome).
- **Impact:** Brittle vs. AntD upgrades (overrides break when selectors shuffle); if the plugin's inline style ever enqueues on a non-plugin admin screen the whole wp-admin UI breaks; no scoping under a plugin-specific body class.
- **Fix:** Use AntD's `ConfigProvider` + `cssinjs` tokens for theming; scope every rule under the plugin's body class; enqueue the style only when `get_current_screen()->id` matches.

#### H13. File size ceiling violated in 5 files (up to 3.5× over limit)
- `elements/booking/src/booking.ts` — 2,811 lines
- `elements/booking/src/booking.css` — 1,982 lines
- `elements/booking/class-booking.php` — 1,502 lines
- `elements/booking/settings/src/SettingsApp.tsx` — 1,765 lines
- `elements/booking/settings/src/CalendarSettingsPanel.tsx` — 1,264 lines
- `elements/booking/settings/src/BookingView.tsx` — 1,244 lines

Rule: 800-line max (`rules/common/coding-style.md`). These are 1.5×–3.5× over.
- **Fix:** Treat as a pre-refactor blocker. Suggested splits:
  - `booking.ts` → `api.ts`, `state.ts`, `calendar-grid.ts`, `slots.ts`, `form.ts`, `stepper.ts`, `html.ts`.
  - `booking.css` → `booking-shell.css`, `booking-stepper.css`, `booking-calendar.css`, `booking-slots.css`, `booking-form.css`, `booking-success.css`, `booking-responsive.css`.
  - `SettingsApp.tsx` → `features/calendars/*` with `useCalendars`, `useCalendarSettings`, `useAdminTheme`, `useWordPressChromeFixes`, `CalendarsProvider`, `AdminToolbar`, `CreateCalendarModal`, `DeleteCalendarModal`.
  - `class-booking.php` → extract control registration into a JSON/array definition file and a separate Renderer class.

#### H14. Public-facing CSS hardcodes colors → breaks on dark Bricks themes
- **Where:** `elements/booking/src/booking.css` — `background: white;` (lines 92, 196, 342, 382, 388), `#dbdddd` (30, 35), `#463600` (220, 636, 1094, 1152, 1164, 1190, 1588, 1626), `#10b981` (1147), `rgba(253, 211, 77, ...)` duplicated, `rgba(0,0,0,0.25)` shadows.
- **Fix:** Lift into `--hbe-booking-*` tokens at the top of the file (there's already a token block — extend it). Add `@media (prefers-color-scheme: dark)` / `[data-theme="dark"]` overrides.

#### H15. Zero tests in the repo
- **Where:** No `tests/`, no `phpunit.xml`, no Vitest/Jest/Playwright config, no `test` script in `package.json`.
- **Impact:** 80% coverage target missed entirely. Highest-risk new paths — public booking creation, email send, SMTP context switching, calendar cascade delete, test-mail endpoint — are zero-covered.
- **Fix:** PHPUnit (Brain Monkey or `wp-env`) + Vitest + Playwright. Minimum viable suite:
  - `HBE_Bookings::delete_for_calendar` — DB cascade
  - `HBE_Plugin::configure_smtp` — PHPMailer field mapping
  - `HBE_REST::delete_admin_calendar` — cascade + permission
  - `HBE_REST::send_test_mail` — auth, validation, error paths
  - `booking.ts` state transitions (inline ↔ stepper)
  - `CalendarSettingsPanel` save flow (happy path + 4xx/5xx error paths)

#### H16. Non-atomic calendar delete
- **Where:** `class-hbe-rest.php:396-425`. Deletes bookings first, then `wp_delete_post()`. If the post delete fails, bookings are gone with no rollback.
- **Fix:** Delete the post first, or wrap in `$wpdb->query('START TRANSACTION')` / commit / rollback (InnoDB only).

#### H17. `CalendarSettingsPanel.tsx:468-474` — language gated by string-comparing the translation
```ts
if (tr("Customers can book up to") === "Customers can book up to") { /* English */ }
else { /* German, with "koennen" typo */ }
```
Inferring locale by round-tripping a translation key and hardcoding both language branches (with a "koennen" missing-umlaut typo) defeats the whole point of the i18n table. Swapping the backend silently breaks this branch.
- **Fix:** Use `getAdminLanguage()` directly, or register pluralized keys (`"Customers can book up to %d day ahead."`, `"Customers can book up to %d days ahead."`).

#### H18. `BookingView.tsx:702-704` — `useEffect(closeModal, [closeModal])`
Fires on mount (and any time `closeModal` would change, which via AntD `form` it generally doesn't). Intent unclear, effect is at best a no-op, at worst a footgun when `form` becomes unstable.
- **Fix:** Delete it, or depend on `[calendarId]` explicitly and document the intent.

#### H19. Trust-everything `as` casts on REST responses
- **Where:** `BookingView.tsx:385, 415, 441`; `SettingsApp.tsx:391, 414, 442, 481`. `data.item as BookingApiItem`, `data.items as AdminCalendar[]`. Server mistakes (string vs number IDs, missing fields) corrupt client state and throw from dayjs / AntD pickers far from the source.
- **Fix:** Zod schemas at the boundary or hand-rolled type guards. Keep `unknown` until validated.

---

### MEDIUM

- **M1. God-component `SettingsApp.tsx`** (1,765 LOC, 22 useState, 12 useEffect, owns 14 unrelated concerns). Split into feature hooks + `CalendarsProvider` context. Currently 12 props threaded through `Sidebar`.
- **M2. Adopt TanStack Query (or SWR).** 9 near-identical `fetch*Request` helpers, 3 copies of `getAdminApiConfig`, hand-rolled `isMounted` flags, no caching/dedupe/retry/abort. A single `useQuery`/`useMutation` pattern eliminates all of it.
- **M3. `booking.ts`** single-file responsibility overload (state, API, DOM rendering, stepper, form, validation, escape helpers). Split as in H13 and consider preact.
- **M4. Inconsistent REST response envelopes.** `{ item }`, `{ items }`, `{ deleted, id }`, `{ success }`. Introduce `HBE_REST::ok( $data, $meta )` helper and standardize.
- **M5. Inline `style={{…}}` objects are re-allocated every render** (`BookingView.tsx`, `SettingsApp.tsx`). Defeats memoization. Move static styles to CSS classes; keep inline only for truly dynamic values.
- **M6. Stable-ref hazards.** `BookingView.tsx:1068-1070` `min={new Date(...)}` / `max={new Date(...)}` — fresh Dates every render. `SettingsApp.tsx:1723-1753` theme token/components object rebuilt every render. Hoist or `useMemo`.
- **M7. Layout-thrash animations in `booking.css`:** `transition: padding` (lines 326-330, 446-450), `transition: grid-template-columns` (98, 408). Use `transform` / `opacity` / `clip-path`.
- **M8. `prefers-reduced-motion` covers only 4 selectors** — misses ~15 other animations/transitions (stepper, column translations, slot-in, spin, success shell). Expand.
- **M9. Unused dead code in `send_booking_confirmation`** (`class-hbe-plugin.php:90-91`): `$service`, `$end` computed but never used. Hardcoded English subject and body — no `__()`, no template merge tokens, no HTML option.
- **M10. `i18n.ts` is untracked but imported.** `git status` shows it as untracked while TSX files reference it. Plugin won't build in other checkouts. **Commit it.**
- **M11. `escapeHtml` used with `X-WP-Nonce` missing on public POST (`booking.ts:785-809`).** Not exploitable today (endpoint is `__return_true`) but the pattern should be right from the start: pass `restNonce` via element data-attr or `wp_localize_script`, send `X-WP-Nonce` on POSTs.
- **M12. `CalendarSettingsPanel.tsx:874-917` non-stable React keys** — two intervals with same start/end collide; editing a time remounts the TimePicker and loses focus. Add `interval.id` and key on it.
- **M13. `CalendarSettingsPanel.tsx:397-438` duplicates `getAdminApiConfig`** with `window as unknown as Record<string, unknown>` cast that defeats the existing `Window` augmentation. Missing i18n registration for 6 test-mail strings. Extract to shared module, remove cast, register keys.
- **M14. `tsconfig.json` has no `include`/`exclude`** and `allowJs: true`, so `tsc --noEmit` walks `vendor/` and emits thousands of errors. Blocks any CI type check. Add `"include": ["elements/**/*", "includes/**/*"]`, `"exclude": ["node_modules", "vendor", "dist", "build"]`.
- **M15. `CalendarSettingsPanel.tsx:433`** swallowed `catch` — `error` discarded. Surface `error.message` in the toast, `console.error(error)` behind a dev guard.

---

### LOW

- **L1. Untracked file triage.**
  - `CLAUDE.md` — empty, gitignore or populate
  - `.codex` — empty tool artifact, gitignore
  - `docs/` — legitimate, commit
  - `elements/booking/settings/src/i18n.ts` — referenced by modified TSX, commit now (see M10)
- **L2. `BookingView.tsx:82` and `SettingsApp.tsx:81`** both `interface Window extends HBricksWindow {}`. Consolidate into `globals.d.ts`.
- **L3. `EVENT_COLORS` color-only signal** (`BookingView.tsx:134-141`) — add shape/icon fallback for color-blind users.
- **L4. `booking.css:473-486` dead CSS** — `.hbe-booking__column--calendar::before` has `content: none` but defines all other pseudo props.
- **L5. `booking.ts:170-175` `calendarInstance.clear` and `calendarInstance.redraw` both call `mountCalendar(state)`.** Duplicate. Consolidate.
- **L6. `strictNullChecks` / `noUncheckedIndexedAccess` leaks:** `booking.ts:259` `EVENT_COLORS[hash % EVENT_COLORS.length]` consumed as `string`; `booking.ts:2789` destructures `[year, month, day]` from `number[]` and feeds `undefined` into `new Date()` → silent `Invalid Date`.
- **L7. Mixed CSS variable namespaces** (`--hbe-booking-*`, `--hbe-calendar-*`, `--hbe-settings-*`, `--hbe-chrome-*`). Document scope in a short `docs/CSS.md`.
- **L8. `class-booking.php:1122-1193`** `render()` ~70 lines, exceeds 50-line guideline. `render_slots_preview_markup` similarly long.
- **L9. `HBE_Plugin::maybe_upgrade` on every admin_init.** Idempotent, just noted.
- **L10. `class-booking.php:1180`** `echo '<div ' . $this->render_attributes('_root') . '>'` — trust chain depends on Bricks' `render_attributes` applying `esc_attr`. Add a confirming comment or explicitly `esc_attr()` the attribute values.

---

## Good practices worth keeping

- Every dynamic SQL query uses `$wpdb->prepare` with proper placeholders.
- Every admin REST route has a real `permission_callback`; public routes use `__return_true` deliberately.
- REST `args` use `sanitize_callback` (`absint`, `sanitize_email`, `sanitize_text_field`) to catch bad input at the framework boundary.
- `get_calendar_or_error()` centralizes existence + post-type checks.
- Booking ownership scoped via composite `id + calendar_id` WHERE — prevents cross-calendar manipulation.
- `in_array(..., true)` strict status allowlist in `prepare_payload`.
- Conflict detection SQL uses properly parameterized range intersection.
- Bricks element data flows through `data-*` attributes, not inline `<script>` JSON — smaller XSS surface.
- `wp_unslash` + `sanitize_text_field` used correctly on `$_GET`.
- Public bookings list strips cancelled + whitelists fields returned to anonymous callers.
- Public booking status forced server-side to `pending` — clients cannot self-confirm.
- CSS has a token block, `prefers-reduced-motion` (partial), BEM-ish naming.
- No `console.log` / `var_dump` / `TODO` / `FIXME` left in the diff.

---

## Validation Results

| Check          | Result  | Notes                                                                          |
|----------------|---------|--------------------------------------------------------------------------------|
| Type check     | Skipped | `tsconfig.json` lacks `include`/`exclude` + `allowJs:true` → walks `vendor/`. See M14. Scoped to changed files, zero errors. |
| Lint (Biome)   | Skipped | Not run per review-only policy                                                 |
| Tests          | N/A     | Zero tests exist in the repo (H15)                                             |
| Build          | Skipped | Review-only                                                                    |
| PHP CS         | Skipped |                                                                                |

---

## Files Reviewed

- Modified: `elements/booking/class-booking.php`
- Modified: `elements/booking/settings/src/BookingCalendar.css`
- Modified: `elements/booking/settings/src/BookingView.tsx`
- Modified: `elements/booking/settings/src/CalendarSettingsPanel.tsx`
- Modified: `elements/booking/settings/src/SettingsApp.css`
- Modified: `elements/booking/settings/src/SettingsApp.tsx`
- Modified: `elements/booking/src/booking.css`
- Modified: `elements/booking/src/booking.ts`
- Modified: `includes/class-hbe-admin.php`
- Modified: `includes/class-hbe-bookings.php`
- Modified: `includes/class-hbe-calendar-settings.php`
- Modified: `includes/class-hbe-plugin.php`
- Modified: `includes/class-hbe-rest.php`
- Untracked: `elements/booking/settings/src/i18n.ts` (commit needed — M10)
- Untracked: `docs/` (commit)
- Untracked: `CLAUDE.md`, `.codex` (gitignore)

---

## Recommended fix order before merge

1. **C1** — strip `mailSettings` from the public endpoint; mask/omit password from admin GET; encrypt at rest.
2. **H1** + **H2** — rate-limit + honeypot public booking; restrict test-mail recipient.
3. **H3** + **H4** — sanitize error-leak; allowlist SMTP hosts.
4. **H5** — try/finally around `set_smtp_context`.
5. **M10** — commit `i18n.ts` immediately (build breaker).
6. **H7** — shared request helper with safe JSON parse (one-line change per call site after helper lands).
7. **H6** — route public-widget strings through `@wordpress/i18n`.
8. Track **H8/H9/H10/H11/H13/H15** as hard follow-up tasks; do not add new features to `SettingsApp.tsx` or `booking.ts` until they are split.
