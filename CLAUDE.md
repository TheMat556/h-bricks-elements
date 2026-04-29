# CLAUDE.md — H-Bricks Elements

**Reusable entry point for AI conversations about this repository.**

## What This Is

A WordPress plugin that adds a custom Bricks Builder element (`h-booking-calendar`) for customer-facing appointment booking, plus an admin React SPA for managing calendars, bookings, and email templates. PHP handles WordPress integration. TypeScript/React builds three separate frontend bundles into `dist/`.

---

## Repository Structure

```
h-bricks-elements/
├── plugin.php                          # Entry point: constants, requires, boot()
├── phpcs.xml                           # WPCS ruleset (elements/ + plugin.php)
├── biome.json                          # TS/JS lint+format config
├── composer.json                       # PHP deps (WPCS, PHPUnit)
├── package.json                        # Node deps (Vite, React, Biome, Ant Design)
│
├── includes/                           # PHP layer — WordPress-style require_once
│   ├── class-hbe-plugin.php            # Bootstrap, cancel page, mail wrappers
│   ├── class-hbe-calendar-post-type.php # CPT: hbe_calendar
│   ├── class-hbe-calendar-settings.php # Per-calendar settings (post meta)
│   ├── class-hbe-bookings.php          # Booking CRUD (custom table)
│   ├── class-hbe-bookings-table.php    # dbDelta schema
│   ├── class-hbe-booking-mail.php      # Email prep, validation, sending
│   ├── class-hbe-admin.php             # Admin menu, asset enqueue
│   └── class-hbe-rest.php              # REST API namespace hbe/v1
│
├── elements/booking/                   # Bricks element + public widget
│   ├── class-booking.php               # Bricks element definition (controls, render)
│   ├── templates/
│   │   ├── col-calendar.php            # Calendar column shell
│   │   ├── col-services.php            # Services column shell
│   │   └── col-slots.php               # Slots column shell
│   ├── src/                            # Public booking widget (ES module)
│   │   ├── booking.ts                  # Entry point: boot, event delegation
│   │   ├── state.ts                    # BookingState factory, layout logic
│   │   ├── api.ts                      # Public REST fetch helpers
│   │   ├── slots.ts                    # Slot generation, conflict detection
│   │   ├── types.ts                    # Shared TS types
│   │   ├── ui/calendar.ts              # Calendar rendering, stepper logic
│   │   ├── ui/stepper.ts               # Stepper panel transitions
│   │   └── booking.css                 # Public widget styles
│   ├── cancel/
│   │   └── cancel.tsx                  # Cancel page React app
│   ├── settings/                       # Admin SPA (IIFE)
│   │   ├── settings.tsx                # Mount point
│   │   ├── src/SettingsApp.tsx         # Shell, calendar list, routing
│   │   ├── src/BookingView.tsx         # react-big-calendar (drag/drop/resize)
│   │   ├── src/CalendarSettingsPanel.tsx # Availability, services, mail config
│   │   ├── src/BookingModal.tsx        # Create/edit booking modal
│   │   ├── src/BookingForm.tsx         # Booking form fields
│   │   ├── src/RightPanel.tsx          # Side panel for BookingView
│   │   ├── src/bookingApi.ts           # Admin REST fetch helpers
│   │   ├── src/useModalOverlay.ts      # Modal z-index management
│   │   ├── src/i18n.ts                 # Translations
│   │   └── src/shared/constants.ts     # Theme tokens
│   └── email-designer/                 # Email designer SPA (IIFE)
│       ├── email-designer.tsx          # Mount point
│       └── src/EmailDesigner.tsx       # React-Email template editor
│       └── src/BookingEmailTemplate.tsx # Email template renderer
│
├── dist/                               # Build output (3 bundles, CSS, assets)
├── vite.config.booking.ts              # Public widget + cancel page
├── vite.config.settings.ts             # Admin SPA
├── vite.config.email-designer.ts       # Email designer SPA
└── vitest.config.ts                    # Test config (threshold 80%)
```

---

## Build System

Three independent Vite configs emit into shared `dist/` with `emptyOutDir: false`:

| Config | Entry | Output | Format | Purpose |
|--------|-------|--------|--------|---------|
| `vite.config.booking.ts` | `elements/booking/src/booking.ts` + `elements/booking/cancel/cancel.tsx` | `dist/booking.js`, `dist/cancel.js` | ES module | Public widget + cancel page |
| `vite.config.settings.ts` | `elements/booking/settings/settings.tsx` | `dist/settings.js` | IIFE | Admin SPA |
| `vite.config.email-designer.ts` | `elements/booking/email-designer/email-designer.tsx` | `dist/email-designer.js` | IIFE | Email designer |

Settings + email-designer use IIFE because they mount inside WordPress admin and must not leak module scope.

**Quirk:** `emptyOutDir: false` means running one Vite config alone will **not** wipe stale bundles from the others. Use `bun run build` for a clean full build.

**Commands:**
- `bun install` — install deps
- `bun run dev` — watch-build all three bundles in parallel
- `bun run build` — production build (sequential: booking → settings → email-designer)
- `bun run check` / `bun run check:fix` — Biome lint + format + organize imports
- `bun run test` — run Vitest test suite
- `bun run coverage` — run Vitest with coverage report (thresholds: 80%)
- `composer install` — install PHP deps
- `composer lint` — `phpcs` against `elements/` and `plugin.php`
- `composer lint:fix` — `phpcbf`
- `composer test` — run PHPUnit test suite

---

## PHP Layer (`includes/`)

### `HBE_Plugin` — Bootstrap & Orchestration

- **`boot()`** — Wires all subsystems: CPT, Admin, REST, Bricks elements, cancel page
- **`activate()`** — Creates custom bookings table (`HBE_Bookings_Table::maybe_create()`), flushes rewrite rules
- **`maybe_upgrade()`** — Re-runs install when `hbe_plugin_version` mismatches `HBE_VERSION`. **Schema changes require bumping `HBE_VERSION`**
- **`handle_cancel_page()`** — Intercepts `?hbe_cancel_booking=1` requests. Validates HMAC token (`hash_hmac('sha256', "$booking_id:$calendar_id", wp_salt('auth'))`). Renders standalone HTML shell mounting `dist/cancel.js`
- **`send_booking_confirmation()`** — Delegates to `HBE_Booking_Mail::send_booking_email()`
- **`normalize_email_logo_url()`** — Strips SVGs when raster resize exists (mail client compatibility)
- **`get_site_logo_url()`** — Returns customizer logo or site icon

### `HBE_Calendar_Post_Type` — Calendar Storage

- Registers `hbe_calendar` CPT (internal-only, no UI, no REST exposure)
- `get_admin_items()` — Returns all calendars with settings icon for admin SPA

### `HBE_Calendar_Settings` — Per-Calendar Configuration

- Stored in post meta under `_hbe_calendar_settings`
- **Settings include:** icon, publicBooking labels, allowDoubleBookings, adminOnly, slotSettings (duration, prep/cleanup time, maxAdvanceDays), mailSettings (from, subject, template), workingHours (7-day intervals), services (id, name, duration, price), exceptions (blocked dates), selectionMode (single/multi)
- **`get_defaults()`** — Comprehensive default settings object
- **`sanitize()`** — Deep sanitization for all nested structures
- **`validate_for_update()`** — Validates mail template placeholders and subject

### `HBE_Bookings` — Booking CRUD

- CRUD against custom `$wpdb->prefix . 'hbe_bookings'` table
- **`list_for_calendar()`** — Range-filtered bookings with pagination
- **`create()`** — Validates booking window, detects conflicts (unless `allowDoubleBookings`), handles duplicate-key race conditions
- **`update()`** — Same validation as create, excludes self from conflict check
- **`delete()`** — Soft-delete by row removal (admin) or status change (public cancel)
- **`prepare_payload()`** — Sanitizes all fields, validates datetime ordering
- **`has_conflict()`** — Overlap query excluding cancelled bookings
- **`is_within_booking_window()`** — Enforces `maxAdvanceDays` setting

### `HBE_Bookings_Table` — Schema

- `dbDelta` creates table with: id, calendar_id, service_id, status, customer_name/email/phone/notes, start_datetime, end_datetime, timezone, meta, created_at, updated_at
- Indexes: calendar_id, start_datetime, end_datetime, status
- **Unique:** `(calendar_id, start_datetime, end_datetime)` — DB-level race condition guard

### `HBE_Booking_Mail` — Email Pipeline

- **`send_booking_email()`** — Prepares and sends via `wp_mail()` (SMTP delegated to site's mail plugin — **do not add a second SMTP layer**)
- **`prepare_booking_email()`** — Renders template with placeholder substitution
- **Placeholders:** `{{logoUrl}}`, `{{customerName}}`, `{{calendarName}}`, `{{date}}`, `{{time}}`, `{{service}}`, `{{cancelUrl}}`
- **Template precedence:** Per-calendar template → global fallback (`hbe_email_template` option)
- **`validate_template_payload()`** — Ensures compiled HTML exists, contains `<html>`/`<body>`, no unknown placeholders
- **Fallback:** Plain HTML email if template not yet compiled
- **Test emails:** `build_test_booking_payload()` generates sample data

### `HBE_Admin` — WordPress Admin Integration

- Registers top-level menu page `H-Bricks Elements` + submenu `Email Designer`
- **`enqueue_settings_assets()`** — Enqueues `dist/settings.js` + boot data (`window.hBricksAdmin`)
- **`enqueue_email_designer_assets()`** — Enqueues `dist/email-designer.js` + boot data
- **`get_boot_data()`** — Injects theme, locale, REST URL/nonce, initial calendars, site info
- **`filter_script_loader_tag()`** — Adds `type="module"` to admin bundle tags
- **CSS injection:** Overrides WordPress admin layout to fill viewport (hides footer, stretches wpbody-content)

### `HBE_REST` — REST API (namespace `hbe/v1`)

**Admin routes** (require `manage_options`):
- `GET/POST /admin/calendars` — List / Create
- `DELETE /admin/calendars/:id` — Delete (cascades bookings)
- `GET/POST /admin/calendars/:id/settings` — Get / Update settings
- `GET /admin/calendars/:id/bookings` — List bookings (date range, pagination)
- `POST /admin/calendars/:id/bookings` — Create booking
- `POST/PUT /admin/calendars/:id/bookings/:booking_id` — Update booking
- `DELETE /admin/calendars/:id/bookings/:booking_id` — Delete booking
- `POST /admin/calendars/:id/test-mail` — Send test email
- `GET/PUT /admin/email-template` — Global fallback template

**Public routes** (open):
- `GET /public/calendars/:id` — Calendar config (cached 60s, strips mailSettings)
- `GET /public/calendars/:id/bookings` — Public booking list (cached 60s, strips sensitive fields, excludes cancelled)
- `POST /public/calendars/:id/bookings` — Create public booking (honeypot field, rate limit: 5/IP/10min, rejects if adminOnly)

**Security features:**
- `validate_date_param()` — Accepts Y-m-d or ISO 8601
- `get_client_ip()` — Proxy-aware IP detection (trusts forwarded headers only from private IPs)
- Honeypot: `website` field rejection
- Rate limiting: Transient-based per-IP per-calendar

---

## Frontend Architecture

### Public Booking Widget (`elements/booking/src/`)

**Entry:** `booking.ts` → mounts on `[data-hbe-booking]` elements

**State machine (`state.ts`):**
- `BookingState` — Single mutable state object (deliberate for this vanilla TS app)
- `createInitialBookingState()` — Parses dataset attributes from server-rendered HTML
- `applyResponsiveLayoutMode()` — Mobile (<640px) forces stepper mode; desktop respects setting
- `setBookingStep()` — Transitions between "availability" and "details" with CSS animations
- `setBookingNotice()` — Error/success toast with animation deduplication

**Event delegation (`booking.ts`):**
- Single listener on root for click/input/submit
- Action routing: stepper targets → service selection → calendar date → calendar nav → time format → slot selection → booking step

**API (`api.ts`):**
- `ensureBookingsLoaded()` — Lazy-loads bookings up to `maxAdvanceDays` range
- `createPublicBookingRequest()` — POSTs booking form + honeypot + timezone

**UI (`ui/calendar.ts`, `ui/stepper.ts`):**
- `mountCalendar()` — Renders month grid with availability dots
- `renderSlots()` — Generates time slots from working hours + exceptions + existing bookings
- `renderFirstColumn()` — Info text or service buttons
- `submitPublicBooking()` — Validates form, POSTs, transitions to success state
- Stepper panels: first → calendar → slots → details → success

**Bricks integration (`elements/booking/class-booking.php`):**
- Extends `Bricks\Element` with extensive style controls (colors, borders, padding, radius)
- `render()` — Outputs 3-column layout (first/calendar/slots) with dataset attributes
- Builder preview renders static HTML mockups for styling

### Admin Settings SPA (`elements/booking/settings/`)

**Entry:** `settings.tsx` → mounts `SettingsApp` into `#h-bricks-admin-root`

**Architecture:**
- React 18 + Ant Design + dayjs + react-big-calendar
- Theme: Light/dark via `data-theme` attribute, synced with `localStorage`
- Primary color: Detected from parent shell CSS variables, falls back to `#2563eb`

**`SettingsApp.tsx` — Shell:**
- Sidebar: Calendar list, view toggles (Booking/Settings), mini calendar, new calendar button
- Toolbar: Navigation (prev/today/next), view switcher (month/week/day/agenda), 12h/24h toggle, panel toggle, new booking button
- Main area: Routes between `BookingView` and `CalendarSettingsPanel`
- Modals: Create calendar, delete calendar confirmation

**`BookingView.tsx` — Calendar Overview:**
- `react-big-calendar` with drag-and-drop + resize addons
- `DnDCalendar` with custom event styling (Ant Design tokens)
- Click empty slot → create booking modal
- Click event → edit booking modal
- Drag/resize → `persistEvent()` with conflict check
- `RightPanel` — Agenda list of upcoming bookings

**`CalendarSettingsPanel.tsx` — Configuration:**
- Tabs: General, Working Hours, Services, Exceptions, Mail, Email Template
- Settings form with real-time validation
- Test email sending
- Unsaved changes indicator
- Dirty state tracking via JSON stringify comparison

**`bookingApi.ts` — Admin REST helpers:**
- `fetchBookingsRequest()` — Range-based fetch with overview merge
- `createBookingRequest()` / `updateBookingRequest()` / `deleteBookingRequest()`
- `hasBookingConflict()` — Client-side conflict detection
- `toBookingEvent()` — Converts REST response to `react-big-calendar` event format

### Email Designer SPA (`elements/booking/email-designer/`)

**Entry:** `email-designer.tsx` → mounts into `#h-bricks-email-designer-root`

- React-Email components for WYSIWYG template editing
- Live preview with placeholder substitution
- Compiles to HTML stored in calendar settings
- Global template fallback via `hbe_email_template` option

### Cancel Page (`elements/booking/cancel/`)

**Entry:** `cancel.tsx` → mounts standalone React app

- PHP renders HTML shell with `window.hbeCancelData` JSON payload
- States: confirm (form with nonce) → success → error
- HMAC token validation on GET, nonce validation on POST

---

## Data Flow

### Public Booking Flow

```
Visitor → Bricks page with h-booking-calendar element
  → PHP renders HTML shell (class-booking.php)
  → booking.ts boots, fetches /public/calendars/:id
  → Fetches /public/calendars/:id/bookings (date range)
  → User selects date → slots.ts generates available slots
  → User selects slot + fills form
  → POST /public/calendars/:id/bookings
    → HBE_REST::create_public_calendar_booking()
    → HBE_Bookings::create() (conflict check, window check)
    → HBE_Plugin::send_booking_confirmation()
    → HBE_Booking_Mail::send_booking_email()
    → wp_mail() (delegated to site's mail plugin)
  → Returns booking JSON → TS renders success state
```

### Admin Booking Flow

```
Admin → WordPress admin → H-Bricks Elements menu
  → HBE_Admin enqueues settings.js + boot data
  → SettingsApp.tsx mounts
  → Fetches /admin/calendars + /admin/calendars/:id/settings
  → BookingView.tsx shows react-big-calendar
  → Admin creates/edits/drags booking
  → POST/PUT /admin/calendars/:id/bookings
    → HBE_REST → HBE_Bookings::create/update
  → Real-time calendar update
```

### Settings Persistence Flow

```
Admin edits settings in CalendarSettingsPanel.tsx
  → Local state updates (dirty=true)
  → Admin clicks Save
  → POST /admin/calendars/:id/settings
    → HBE_REST::update_admin_calendar_settings()
    → HBE_Calendar_Settings::update() (sanitize + validate)
    → update_post_meta(_hbe_calendar_settings)
  → Returns sanitized settings → TS updates state (dirty=false)
```

---

## Key Conventions & Constraints

### PHP
- Class files: `includes/class-hbe-<name>.php`, class name `HBE_<Name>`
- No PSR-4 autoloading — WordPress-style `require_once`
- `phpcs.xml` enforces `WordPress` ruleset + `WordPress.Files.FileName`
- Bricks element registration hooks `init` at priority **11** (Bricks registers earlier)
- Activation hook creates custom bookings table and flushes rewrite rules
- Schema changes **require bumping `HBE_VERSION`**
- SMTP delivery delegates to site's active mail plugin — **do not add a second SMTP layer**
- Cancel flow: HMAC SHA-256 with `wp_salt('auth')`, confirmation POST requires WP nonce
- Cancel page returns HTTP **400** on error, **200** otherwise

### TypeScript
- Strict mode + `noUncheckedIndexedAccess`. Tab indent. Double quotes.
- Immutability enforced — use spread, avoid mutation.
- No `console.log` in committed code.
- Biome ignores `dist/` and `node_modules/`; respects `.gitignore`

### CSS
- Public widget uses custom properties like `--hbe-booking-panel-min-height` for layout stability
- Admin SPA uses Ant Design tokens + CSS custom properties for theming
- Calendar layout stability depends on outer flex preserving fixed height

---

## Verified Facts vs. Stale Claims

- `.gitignore` ignores `dist/`. Do not assume `dist/` is tracked.
- `AGENTS.md` exists with compact executable facts; this file provides full architectural context.
- Build artifacts are **not** committed by default (`.gitignore` covers `dist/`).
- The plugin version in `plugin.php` is `0.0.1` but the header says `0.0.0`.
- Test runner **is** configured (Vitest + PHPUnit).
- No database migrations framework — schema changes handled via `HBE_VERSION` bump + `maybe_upgrade()`.
