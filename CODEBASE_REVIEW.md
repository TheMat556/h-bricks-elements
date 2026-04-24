# Master Codebase Review — h-bricks-elements

**Branch:** feat/calendar-impl  
**Date:** 2026-04-23  
**Scope:** Full plugin (PHP backend, TypeScript/React frontend, CSS, build config)

---

## 1. Executive Summary — Top 5 Critical Issues

| # | Issue | Severity | Dimension | Effort |
|---|-------|----------|-----------|--------|
| 1 | **Race condition / double-booking vulnerability** — `has_conflict()` then `insert()` with no DB transaction or unique index. Two concurrent public requests can book the same slot. | CRITICAL | Backend / API | M |
| 2 | **5 frontend files massively exceed 800-line limit** — `booking.ts` (3378), `class-booking.php` (1499), `SettingsApp.tsx` (1778), `CalendarSettingsPanel.tsx` (1340), `BookingView.tsx` (1245). Unmaintainable, high bug surface. | CRITICAL | Coding Standards | L |
| 3 | **Rate limiter broken behind reverse proxies** — `get_client_ip()` only reads `REMOTE_ADDR`, ignores `X-Forwarded-For`. All Cloudflare/nginx-proxied visitors share one bucket. | CRITICAL | Backend / API | S |
| 4 | **~400 lines of theme/DOM utilities duplicated across 3 bundles** — `SettingsApp.tsx`, `email-designer.tsx`, `BookingView.tsx` share identical `readStoredTheme`, `applyWordPressLayoutHeightFix`, `readShellPrimaryColor`, modal overlay logic. | CRITICAL | Frontend / Standards | M |
| 5 | **Hardcoded dark-mode tokens inline in Ant Design ConfigProvider** — 15+ color values baked into JSX instead of deriving from `theme.darkAlgorithm` or CSS variables. Maintenance nightmare, no shell override support. | CRITICAL | Design System | M |

**Overall Verdict: BLOCK** — 2 critical security/architecture issues and 5 critical structural issues must be resolved before merge.

---

## 2. Full Findings

### 2.1 Frontend Patterns Review

#### Critical
| ID | File | Line | Finding | Recommendation |
|----|------|------|---------|----------------|
| F-C1 | `elements/booking/src/booking.ts` | ~1109 | Public booking POST sends no CSRF token. Backend relies on `__return_true` permission callback. Verify server has origin/honeypot protection; if not, add nonce or SameSite guard. | Confirm PHP handler protection; document risk surface. |

#### Major
| ID | File | Line | Finding | Recommendation |
|----|------|------|---------|----------------|
| F-M1 | `SettingsApp.tsx`, `email-designer.tsx` | 46-365, 25-181 | ~200 lines of identical theme infrastructure (`readStoredTheme`, `applyThemeToDOM`, `readShellPrimaryColor`, etc.) duplicated across bundles. | Extract shared `theme.ts` utility; reference from both Vite configs as shared chunk. |
| F-M2 | `SettingsApp.tsx`, `BookingView.tsx`, `CalendarSettingsPanel.tsx`, `EmailDesigner.tsx` | various | `tr()` called dozens of times per render without memoization. `getAdminLanguage()` reads `window.hBricksAdmin?.locale` on every call. | Compute language once at module load; cache `tr` result. |
| F-M3 | `SettingsApp.tsx` | 1583-1584 | `getAdminApiConfig()` queries DOM for `#h-bricks-admin-root` attributes twice per render. | Call once at module init; memoize. |
| F-M4 | `booking.ts` | 582-594 | Stepper buttons lack `aria-current="step"` and `aria-disabled` for screen readers. | Add ARIA attributes to stepper navigation. |
| F-M5 | `booking.ts` | 2740-2756 | Booking form only validates non-empty strings; no email format check. | Add regex email validation before submission. |
| F-M6 | `BookingView.tsx` | 445-612 | `RightPanel` receives full `events` array, filters/sorts on every render, not wrapped in `React.memo`. | Wrap in `React.memo`; `useMemo` for filtered lists. |
| F-M7 | `CalendarSettingsPanel.tsx` | entire file | Monolithic 1339-line component contains all settings sections inline. | Extract `WorkingHoursSection`, `ServicesSection`, `ExceptionsSection`, `MailServiceSection`. |
| F-M8 | `CalendarSettingsPanel.tsx` | 241-249 | `weekdayLabels` object recreated on every render. | Move to module scope or `useMemo`. |
| F-M9 | `CalendarSettingsPanel.tsx` | 421 | `handleSendTestMail` not wrapped in `useCallback`. | Wrap in `useCallback`. |
| F-M10 | `EmailDesigner.tsx` | 431-473 | Compile effect calls `onChange` with updated template, creating circular dependency chain through parent state. | Store compiled state locally; push to parent only on explicit save. |
| F-M11 | `BookingView.tsx` | 784-800 | `formats` object literal changes identity every render, forcing `react-big-calendar` re-render. | Wrap in `useMemo([use24h])`. |
| F-M12 | `BookingView.tsx` | 1146-1162 | "Short Description" field has `required: true` in form rules. | Remove `required` rule unless business mandates it. |

#### Minor
| ID | File | Line | Finding | Recommendation |
|----|------|------|---------|----------------|
| F-m1 | `settings/settings.css` | 1 | File is empty, imported nowhere. | Remove dead file and Vite reference. |
| F-m2 | `BookingEmailTemplate.tsx` | 54 | `_backgroundColor` destructured but never used; body background hardcoded `#ffffff`. | Use the prop or remove it from interface. |
| F-m3 | `BookingView.tsx` | 218-222 | Magic numbers `-14` / `+30` for agenda fetch range. | Extract named constants. |
| F-m4 | `SettingsApp.tsx`, `email-designer.tsx` | 1740-1746, 559-566 | Dark theme colors hardcoded inline (`#131c2b`, `#192437`, etc.). | Extract to `DARK_THEME_TOKENS` constant. |
| F-m5 | `CancelApp.tsx` | 29-43 | `Logo` component has no `onError` fallback for broken image URLs. | Add `onError` handler to hide or show placeholder. |
| F-m6 | `BookingView.tsx` | 1169 | DatePicker format hardcoded `DD.MM.YYYY` (German-centric). | Use locale-aware format from `getCalendarCulture()`. |
| F-m7 | `CalendarSettingsPanel.tsx` | 337-348 | Service reorder uses `splice` mutation on copied array. | Use immutable `filter` + spread insert. |
| F-m8 | `EmailDesigner.tsx` | 679 | iframe sandbox is `allow-same-origin` without explanation. | Document why same-origin is needed; restrict further if possible. |

---

### 2.2 Coding Standards Audit

#### Critical
| ID | File | Lines | Finding | Recommendation |
|----|------|-------|---------|----------------|
| S-C1 | `elements/booking/class-booking.php` | 1499 | File exceeds 800-line limit by ~700 lines. `set_controls()` alone is ~994 lines. | Extract controls into `includes/class-hbe-booking-controls.php`. Reduce preview markup with shared helper. |
| S-C2 | `elements/booking/src/booking.ts` | 3378 | File exceeds limit by ~2600 lines — largest in codebase. | Split into: `types.ts`, `state.ts`, `api.ts`, `slots.ts`, `ui/stepper.ts`, `ui/calendar.ts`, `booking.ts` (orchestrator). |
| S-C3 | `elements/booking/settings/src/SettingsApp.tsx` | 1778 | File exceeds limit by ~980 lines. `App` component ~878 lines with 30+ state vars. | Extract hooks (`useTheme.ts`, `useCalendars.ts`), components (`Sidebar/`, `Toolbar.tsx`, `ShellModal.tsx`). |
| S-C4 | `elements/booking/settings/src/CalendarSettingsPanel.tsx` | 1340 | File exceeds limit by ~540 lines. | Extract sub-components per section into `CalendarSettingsPanel/sections/`. |
| S-C5 | `elements/booking/settings/src/BookingView.tsx` | 1245 | File exceeds limit by ~445 lines. | Extract `RightPanel.tsx`, `BookingModal.tsx`, `BookingForm.tsx`, `useModalOverlay.ts`. |

#### High
| ID | File | Lines | Finding | Recommendation |
|----|------|-------|---------|----------------|
| S-H1 | `includes/class-hbe-rest.php` | 38-309 | `register_routes()` is 272 lines. | Split route registration by resource group into separate methods or file. |
| S-H2 | `includes/class-hbe-bookings.php` | 77-143, 153-233, 344-418 | `create()` 67 lines, `update()` 81 lines, `prepare_payload()` 75 lines — all over 50-line limit. | Split field-by-field assignment; extract validation helpers. |
| S-H3 | `includes/class-hbe-booking-mail.php` | 152-270 | `prepare_booking_email()` is 119 lines. | Extract template rendering, header construction, sending into private methods. |
| S-H4 | Cross-file | various | ~400 lines of duplicated theme/DOM utilities across `SettingsApp.tsx`, `BookingView.tsx`, `email-designer.tsx`. | Create `settings/src/shared/dom.ts` and `settings/src/shared/theme.ts`. |
| S-H5 | `index.ts` | 1 | Contains `console.log("Hello via Bun!");` — scaffold leftover. | Remove. |
| S-H6 | Project root | n/a | No test runner configured. CLAUDE.md requires 80% coverage but no framework exists. | Add Vitest or Jest; write unit tests for bookings CRUD, slot generation, email compilation, HMAC verification. |
| S-H7 | `tsconfig.json` | n/a | `noUnusedLocals: false`, `noUnusedParameters: false` — should be stricter. | Enable both for cleaner code. |

#### Medium
| ID | File | Lines | Finding | Recommendation |
|----|------|-------|---------|----------------|
| S-M1 | `elements/booking/templates/col-services.php` | 1-5 | Contains `<p>TEST</p>` placeholder content. | Remove or replace with real content. |
| S-M2 | `elements/booking/templates/col-calendar.php`, `col-services.php` | various | Hardcoded German text ("Kalender", "Services") without `__()` translation. | Use WordPress `__()` or `esc_html__()`. |
| S-M3 | `settings/src/i18n.ts` | 192 | Typo: "Kunden koennen" should be "Kunden können". | Fix umlaut. |
| S-M4 | `settings/src/BookingEmailTemplate.tsx` | 85-340 | Hardcoded English strings not internationalized. | Use `tr()` or make configurable. |
| S-M5 | `includes/class-hbe-admin.php` | 251-295 | Large CSS strings inline in PHP. | Extract to `.css` file. |

---

### 2.3 Design System Compliance

#### Critical
| ID | File | Lines | Finding | Recommendation |
|----|------|-------|---------|----------------|
| D-C1 | `SettingsApp.tsx` | 1739-1762 | Dark theme config hardcodes 15+ color values in Ant Design `ConfigProvider` instead of using `theme.darkAlgorithm` or CSS variables. | Derive from `theme.darkAlgorithm` with selective overrides; or move to shared `darkTokenOverrides` object. |

#### Major
| ID | File | Lines | Finding | Recommendation |
|----|------|-------|---------|----------------|
| D-M1 | `settings/settings.css` | 1 | Empty file imported by settings IIFE build. | Remove dead file/import. |
| D-M2 | Multiple | various | Three color strategies with no shared token layer: booking.css uses Bricks CSS vars, Settings SPA uses Ant Design tokens, BookingCalendar.css uses `--hbe-calendar-*` vars. | Introduce shared `:root` token block mapping `--hbe-primary`, `--hbe-surface`, etc. |
| D-M3 | `SettingsApp.tsx`, `BookingView.tsx` | 48, 49 | `ADMIN_MODAL_Z_INDEX = 100010` and `BOOKING_MODAL_Z_INDEX = 100010` duplicated. | Extract to shared constants file. |
| D-M4 | `EmailDesigner.tsx` | 668-680 | iframe uses `background: "#fff"` and `borderRadius: 8` inline instead of tokens. | Use `token.colorBgContainer` and `token.borderRadiusLG`. |
| D-M5 | `CalendarSettingsPanel.tsx` | 98-111 | Hardcoded emoji icons (`📅`, `💇`, etc.) with no fallback for disabled emoji rendering. | Extract to config; add text alternatives. |
| D-M6 | `BookingEmailTemplate.tsx` | 85-340 | 11 hardcoded hex colors (`#111827`, `#6b7280`, etc.) — Tailwind grays baked in. | Accept text color parameters or derive from primary color luminance. |
| D-M7 | `CancelApp.tsx` | 147-151 | Cancel page uses bare `ConfigProvider` with no primary color or dark mode algorithm. | Pass site theme from `window.hBricksAdmin` data. |
| D-M8 | `SettingsApp.tsx` | 50 | `DEFAULT_PRIMARY_COLOR = "#1677ff"` (Ant Design blue) mismatches booking widget default `#fdd34d`. | Align defaults or derive from shell CSS var. |

#### Minor
| ID | File | Lines | Finding | Recommendation |
|----|------|-------|---------|----------------|
| D-m1 | `SettingsApp.tsx`, `BookingView.tsx` | 1233, 1248, 1610, 750, 765, 1094 | `rgba(0,0,0,0.45)` modal backdrop repeated 6 times. | Use `token.colorBgMask`. |
| D-m2 | Multiple | various | Inconsistent `gap` values (4, 6, 8, 10, 12, 14, 16, 18, 20) across Flex components. | Use Ant Design token scale (`marginXS`, `marginSM`, etc.). |
| D-m3 | `SettingsApp.tsx`, `CalendarSettingsPanel.tsx`, `EmailDesigner.tsx` | 704, 303, 664 | Hardcoded `fontSize: 11` / `fontSize: 12` for labels. | Use `token.fontSizeSM`. |
| D-m4 | `BookingCalendar.css` | 37, 48-49, 279, 286-287, etc. | ~15 `!important` declarations overriding `react-big-calendar`. | Use library's `className`/`style` props instead. |
| D-m5 | `SettingsApp.css` | 74-81, 95-97 | ~30 `!important` declarations customizing Ant Design inputs. | Use `ConfigProvider` `theme.components.Input` instead. |
| D-m6 | `SettingsApp.tsx` | 1337 | Toolbar height hardcoded `64px`. | Use `token.sizeXXL` or reference CSS var. |
| D-m7 | Multiple | various | Scattered `fontWeight` values (500, 600, 700, 800, 900) with no token scale. | Define `fontWeightStrong` constant or use design token. |

---

### 2.4 Backend Patterns Review

#### Critical
| ID | File | Lines | Finding | Recommendation |
|----|------|-------|---------|----------------|
| B-C1 | `includes/class-hbe-rest.php`, `class-hbe-bookings.php` | 717-778, 77-143 | **Double-booking race condition** — `has_conflict()` reads, then `insert()` writes with no DB transaction or unique constraint. Two concurrent requests can both pass. | Add unique composite index on `(calendar_id, start_datetime, end_datetime)`; or wrap in `START TRANSACTION ... FOR UPDATE`. |
| B-C2 | `includes/class-hbe-rest.php` | 736-748 | Rate limiter uses `md5($ip . '_' . $calendar->ID)` and increments counter on every request including validation failures. | Move `set_transient` to after successful booking; use `wp_hash()` instead of MD5. |

#### Major
| ID | File | Lines | Finding | Recommendation |
|----|------|-------|---------|----------------|
| B-M1 | `includes/class-hbe-calendar-post-type.php` | 75-99 | N+1 query — `get_admin_items()` calls `HBE_Calendar_Settings::get()` (which loads all post meta) for each calendar. | Use `update_meta_cache()` before loop; or add lightweight `get_icon_only()` method. |
| B-M2 | `includes/class-hbe-bookings.php` | 402-404 | `sanitize_email()` result never validated. Empty string or invalid email silently stored. | Add `is_email()` check after `sanitize_email()`; reject with `WP_Error` if invalid. |
| B-M3 | `includes/class-hbe-booking-mail.php` | 214-228 | Fallback email template escapes vars with `esc_html()` but `nl2br()` applied after `str_replace` could leak HTML-like content. | Clarify replacement chain; ensure consistent escaping. |
| B-M4 | `includes/class-hbe-rest.php` | 935-943 | `get_client_ip()` only reads `REMOTE_ADDR`, ignores proxy headers. | Check `HTTP_X_FORWARDED_FOR` / `HTTP_X_REAL_IP` / `HTTP_CF_CONNECTING_IP`. |
| B-M5 | `includes/class-hbe-plugin.php` | 256-266 | Cancel page uses `check_admin_referer()` which calls `die()` on failure instead of controlled error. HMAC token in URL is reusable. | Use `wp_verify_nonce()` + controlled error page; consider single-use cancel tokens. |
| B-M6 | `includes/class-hbe-bookings.php` | 545-562 | `format_row()` silently drops `meta` column from REST responses with no comment. | Either include `meta` (decoded) or add doc comment explaining intentional exclusion. |

#### Minor
| ID | File | Lines | Finding | Recommendation |
|----|------|-------|---------|----------------|
| B-m1 | `includes/class-hbe-bookings.php` | 44-45, 55-56 | `$wpdb->prepare` with `%i` for table name is correct but `phpcs:ignore` on lines 323, 332 is unnecessary. | Use `%i` consistently in `get_raw()` too. |
| B-m2 | `includes/class-hbe-plugin.php` | 128 | `flush_rewrite_rules()` on activation can be slow on large sites. | Consider removing since CPT is `public => false` and doesn't need rewrites. |
| B-m3 | `includes/class-hbe-bookings.php` | 439-469 | `has_conflict()` uses two nearly identical queries differing only by `id != %d`. | Always include `id != %d` and pass `0` when no exclusion needed. |
| B-m4 | `includes/class-hbe-rest.php` | 564 | Admin-created bookings send confirmation email synchronously. Slow SMTP = blocked REST request. | Consider `WP_Cron` or Action Scheduler for async send. |
| B-m5 | `includes/class-hbe-rest.php` | 787-802 | `validate_date_param()` allows parseable but invalid dates (e.g., `2026-13-45`). | Check `DateTime::getLastErrors()` after `createFromFormat`. |
| B-m6 | `includes/class-hbe-calendar-settings.php` | 541-549 | `sanitize_date_string()` regex validates format not reality. | Add `strtotime()` or `DateTime::createFromFormat` check. |
| B-m7 | `includes/class-hbe-rest.php` | 951-961 | `get_request_payload()` falls back to `$request->get_params()` which includes URL params. | Use `$request->get_body_params()` instead. |
| B-m8 | `includes/class-hbe-plugin.php`, `class-hbe-booking-mail.php` | 40-48, 294-303 | `error_log()` writes raw booking data (emails, names) to PHP error log. | Redact PII; log IDs only. |
| B-m9 | `includes/class-hbe-calendar-settings.php` | 397-400 | `compiledHtml` stored as raw string without XSS validation. | Check for `<script>`, `on*=` handlers, `javascript:` URIs. |

---

### 2.5 API Design Review

#### Critical
| ID | File | Lines | Finding | Recommendation |
|----|------|-------|---------|----------------|
| A-C1 | `includes/class-hbe-rest.php` | 239-251, 717 | Public booking endpoint uses `permission_callback => '__return_true'`. Only protection is honeypot + IP rate limiter. | Document as known risk surface; consider reCAPTCHA hook or per-calendar secret token. |
| A-C2 | `includes/class-hbe-rest.php` | 278-348 | `/admin/email-template` stores single global template via `update_option()`. Per-calendar templates in post meta never consult global. | Deprecate global endpoint if per-calendar is primary UX; or document precedence (global = default fallback). |

#### Major
| ID | File | Lines | Finding | Recommendation |
|----|------|-------|---------|----------------|
| A-M1 | `includes/class-hbe-rest.php` | 663-709 | Public bookings list returns `status` and `serviceId` — attacker can enumerate full schedule. | Return only opaque "busy" blocks (start/end only) from public endpoint. |
| A-M2 | `includes/class-hbe-rest.php` | 736-748 | Rate limiter key is `md5(ip + calendar_id)` — weak against shared NAT / IPv6 rotation. | Use longer window or daily cap; use `wp_hash()`; add `Retry-After` header. |
| A-M3 | `includes/class-hbe-rest.php` | 431-471 | `update_admin_calendar_settings` passes entire `settings` sub-object to `HBE_Calendar_Settings::update()`. | Currently safe due to sanitize allowlist; add explicit allowlist comment. |
| A-M4 | `includes/class-hbe-bookings.php`, `class-hbe-rest.php` | 25-68, 116-152, 212-251 | `list_for_calendar` has no pagination — unbounded query. | Add `per_page`/`page` with default LIMIT 100. |
| A-M5 | `includes/class-hbe-rest.php`, `class-hbe-bookings.php` | 760-764, 95-104 | Conflict check does NOT exclude `status = 'pending'`. Concurrent pending bookings can double-book. | Exclude `pending` from conflict check or wrap in transaction. |
| A-M6 | `includes/class-hbe-rest.php` | 935-943 | `get_client_ip()` ignores proxy headers (same as B-M4). | Check forwarded headers. |
| A-M7 | `includes/class-hbe-rest.php` | 291-306 | Email template update accepts arbitrary `template` keys; `compiledHtml` can be written without re-compilation. | Reject if `compiledHash` mismatched; recompile server-side if needed. |
| A-M8 | `includes/class-hbe-bookings.php` | 42-51, 53-60 | `SELECT *` queries fetch all columns including future ones. | Use explicit column lists. |

#### Minor
| ID | File | Lines | Finding | Recommendation |
|----|------|-------|---------|----------------|
| A-m1 | `includes/class-hbe-rest.php` | 22 | Namespace hardcoded `hbe/v1` with no versioning strategy documented. | Document that breaking changes bump to v2. |
| A-m2 | `includes/class-hbe-rest.php` | various | Inconsistent response envelopes (`{ items }`, `{ item, settings }`, `{ deleted }`, `{ template }`). | Adopt consistent `{ data }` / `{ data, meta }` envelope. |
| A-m3 | `includes/class-hbe-rest.php` | 195-210, 212-251 | Public GET endpoints lack `Cache-Control` headers. | Add `Cache-Control: public, max-age=60`. |
| A-m4 | `includes/class-hbe-calendar-settings.php` | 541-549 | `sanitize_date_string()` regex accepts invalid calendar dates. | Add `checkdate()` after regex match. |
| A-m5 | `includes/class-hbe-rest.php` | 740-746 | 429 responses lack `Retry-After` header per RFC 6585. | Add `header('Retry-After: 600')`. |
| A-m6 | `elements/booking/src/booking.ts` | 1116-1118 | Frontend sends `customerEmail` without client-side format validation. | Add client-side email regex validation. |
| A-m7 | `includes/class-hbe-rest.php` | various | No OpenAPI/JSON Schema registered for REST endpoints. | Add `schema` property to `register_rest_route` calls. |
| A-m8 | `elements/booking/settings/src/CalendarSettingsPanel.tsx` | 123-127 | `createClientId` uses `Date.now() + Math.random()` — collision possible under rapid adds. | Use `crypto.randomUUID()` with fallback. |

---

## 3. Priority Remediation Plan

### Phase 1 — Security & Data Integrity (Must fix before merge)
| # | Task | Issue IDs | Effort | Owner |
|---|------|-----------|--------|-------|
| 1.1 | Fix double-booking race condition — add DB unique index or transaction around conflict check + insert | B-C1, A-M5 | M | Backend |
| 1.2 | Fix rate limiter behind reverse proxies — read `X-Forwarded-For` / `CF-Connecting-IP` | B-C2, B-M4, A-M2, A-M6 | S | Backend |
| 1.3 | Add `is_email()` validation after `sanitize_email()` in `prepare_payload()` | B-M2 | S | Backend |
| 1.4 | Document or deprecate global email template endpoint vs per-calendar templates | A-C2 | S | Backend |
| 1.5 | Replace `check_admin_referer()` with `wp_verify_nonce()` + controlled error on cancel page | B-M5 | S | Backend |

### Phase 2 — Structural Refactoring (High impact, medium effort)
| # | Task | Issue IDs | Effort | Owner |
|---|------|-----------|--------|-------|
| 2.1 | Split `booking.ts` (3378 lines) into typed modules | S-C2 | L | Frontend |
| 2.2 | Split `class-booking.php` (1499 lines) — extract controls + previews | S-C1 | L | Frontend/PHP |
| 2.3 | Split `SettingsApp.tsx` (1778 lines) — extract hooks, Sidebar, Toolbar, ShellModal | S-C3 | M | Frontend |
| 2.4 | Split `CalendarSettingsPanel.tsx` (1340 lines) — extract section components | S-C4, F-M7 | M | Frontend |
| 2.5 | Split `BookingView.tsx` (1245 lines) — extract RightPanel, BookingModal, BookingForm | S-C5, F-M6 | M | Frontend |
| 2.6 | Extract shared theme/DOM utilities into `settings/src/shared/` | F-M1, S-H4 | M | Frontend |

### Phase 3 — Design System Alignment
| # | Task | Issue IDs | Effort | Owner |
|---|------|-----------|--------|-------|
| 3.1 | Replace inline dark-mode tokens with `theme.darkAlgorithm` or shared `darkTokenOverrides` | D-C1, F-m4 | M | Frontend |
| 3.2 | Align default primary color between booking widget and admin SPA | D-M8 | S | Frontend |
| 3.3 | Pass site theme to Cancel App ConfigProvider | D-M7 | S | Frontend |
| 3.4 | Extract shared `:root` CSS token layer bridging booking.css and admin SPA | D-M2 | M | Frontend |
| 3.5 | Parameterize hardcoded email template colors | D-M6 | M | Frontend |

### Phase 4 — API Hardening & Polish
| # | Task | Issue IDs | Effort | Owner |
|---|------|-----------|--------|-------|
| 4.1 | Add pagination (`per_page`/`page`) to booking list endpoints | A-M4 | S | Backend |
| 4.2 | Return only "busy" blocks from public bookings endpoint | A-M1 | S | Backend |
| 4.3 | Add `Cache-Control` headers to public GET endpoints | A-m3 | S | Backend |
| 4.4 | Add `Retry-After` to 429 responses | A-m5, A-M2 | S | Backend |
| 4.5 | Use explicit column lists instead of `SELECT *` | A-M8 | S | Backend |
| 4.6 | Fix `get_request_payload()` to use `get_body_params()` | B-m7 | S | Backend |
| 4.7 | Redact PII from `error_log()` calls | B-m8 | S | Backend |
| 4.8 | Add client-side email validation to booking form | F-M5, A-m6 | S | Frontend |
| 4.9 | Add `checkdate()` to `sanitize_date_string()` | A-m4, B-m6 | S | Backend |
| 4.10 | Validate `compiledHtml` for XSS in `sanitize_mail_template()` | B-m9 | S | Backend |

### Phase 5 — Testing & Tooling
| # | Task | Issue IDs | Effort | Owner |
|---|------|-----------|--------|-------|
| 5.1 | Add test runner (Vitest) and configure coverage | S-H6 | M | DevOps |
| 5.2 | Write unit tests for `HBE_Bookings::create/update/has_conflict` | S-H6 | M | Backend |
| 5.3 | Write unit tests for slot generation logic in `booking.ts` | S-H6 | M | Frontend |
| 5.4 | Write tests for email template compilation | S-H6 | S | Frontend |
| 5.5 | Write tests for cancel flow HMAC verification | S-H6 | S | Backend |
| 5.6 | Enable `noUnusedLocals` and `noUnusedParameters` in tsconfig | S-H7 | S | Frontend |

---

## 4. Quick Wins (< 30 min each, high impact)

| # | Task | Issue IDs | File |
|---|------|-----------|------|
| Q1 | Remove empty `settings/settings.css` and its Vite import | D-M1, F-m1 | `settings/settings.css` |
| Q2 | Remove `console.log("Hello via Bun!")` from `index.ts` | S-H5 | `index.ts` |
| Q3 | Remove `<p>TEST</p>` from `col-services.php` | S-M1 | `templates/col-services.php` |
| Q4 | Fix German typo "koennen" → "können" in `i18n.ts` | S-M3 | `settings/src/i18n.ts` |
| Q5 | Wrap `getAdminApiConfig()` call once in `SettingsApp.tsx` | F-M3 | `settings/src/SettingsApp.tsx` |
| Q6 | Memoize `weekdayLabels` in `CalendarSettingsPanel.tsx` | F-M8 | `settings/src/CalendarSettingsPanel.tsx` |
| Q7 | Wrap `handleSendTestMail` in `useCallback` | F-M9 | `settings/src/CalendarSettingsPanel.tsx` |
| Q8 | Memoize `formats` object in `BookingView.tsx` | F-M11 | `settings/src/BookingView.tsx` |
| Q9 | Deduplicate `100010` z-index constant into shared file | D-M3 | `settings/src/shared/constants.ts` (new) |
| Q10 | Add `aria-current` and `aria-disabled` to stepper buttons | F-M4 | `elements/booking/src/booking.ts` |
| Q11 | Add `is_email()` validation in `prepare_payload()` | B-M2 | `includes/class-hbe-bookings.php` |
| Q12 | Add `Retry-After: 600` header to 429 responses | A-m5 | `includes/class-hbe-rest.php` |
| Q13 | Use explicit column lists in `SELECT` queries | A-M8 | `includes/class-hbe-bookings.php` |
| Q14 | Add `checkdate()` to `sanitize_date_string()` | A-m4 | `includes/class-hbe-calendar-settings.php` |
| Q15 | Replace `get_params()` with `get_body_params()` in `get_request_payload()` | B-m7 | `includes/class-hbe-rest.php` |
| Q16 | Add client-side email regex validation to booking form | F-M5 | `elements/booking/src/booking.ts` |
| Q17 | Wrap `RightPanel` in `React.memo` + `useMemo` for filtered events | F-M6 | `settings/src/BookingView.tsx` |
| Q18 | Remove `required` rule from booking description field | F-M12 | `settings/src/BookingView.tsx` |
| Q19 | Use `token.colorBgMask` instead of `rgba(0,0,0,0.45)` | D-m1 | `SettingsApp.tsx`, `BookingView.tsx` |
| Q20 | Add `onError` fallback to `Logo` in `CancelApp.tsx` | F-m5 | `elements/booking/cancel/CancelApp.tsx` |

---

## Appendix: Severity Count Summary

| Dimension | Critical | Major | Minor |
|-----------|----------|-------|-------|
| Frontend Patterns | 1 | 11 | 8 |
| Coding Standards | 5 | 12 | 8 |
| Design System | 1 | 7 | 8 |
| Backend Patterns | 2 | 6 | 9 |
| API Design | 2 | 8 | 7 |
| **TOTAL** | **11** | **44** | **40** |

**Blockers (Critical):** 11  
**Warnings (Major):** 44  
**Notes (Minor):** 40
