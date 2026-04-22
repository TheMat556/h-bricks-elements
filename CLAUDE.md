# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`h-bricks-elements` is a WordPress plugin that adds custom Bricks Builder elements plus an admin booking/calendar UI. PHP handles the WordPress integration (post types, REST, admin pages, mail, cancel flow). TypeScript/React builds three separate frontend bundles: public booking widget, admin settings SPA, and email designer.

## Commands

Frontend (Vite + Biome, runs via `bun` or `npm`):
- `bun install` — install deps
- `npm run dev` — watch-build all three bundles in parallel
- `npm run build` — production build of `booking`, `settings`, `email-designer` bundles into `dist/`
- `npm run check` / `npm run check:fix` — Biome lint + format
- `npm run lint` — Biome lint only
- `npm run format` — Biome format write

PHP (WordPress Coding Standards):
- `composer install`
- `composer lint` — runs `phpcs` against `elements/` and `plugin.php` using `phpcs.xml` (WordPress ruleset)
- `composer lint:fix` — runs `phpcbf`

No test runner configured. No single-test command.

## Architecture

### Entry & boot

`plugin.php` defines constants (`HBE_PLUGIN_FILE`, `HBE_PLUGIN_DIR`, `HBE_PLUGIN_URL`, `HBE_VERSION`), requires all `includes/class-hbe-*.php` files, and calls `HBE_Plugin::boot()`. Activation hook runs `HBE_Plugin::activate()` which calls `HBE_Bookings_Table::maybe_create()` (custom DB table) and flushes rewrites. `maybe_upgrade()` re-runs install when `hbe_plugin_version` option mismatches `HBE_VERSION`.

`HBE_Plugin::boot()` wires:
- Calendar CPT registration (`HBE_Calendar_Post_Type`)
- Admin page registration (`HBE_Admin`)
- REST routes (`HBE_REST`)
- Bricks element registration via `bricks/builder/i18n` filter and `init` action (priority 11) — loads `elements/booking/class-booking.php` through `\Bricks\Elements::register_element()`
- Customer-facing cancel page via `template_redirect` hook, with HMAC-signed tokens (`wp_salt('auth')`) — renders standalone HTML shell that mounts `dist/cancel.js`
- `wp_mail_failed` logger capturing `HBE_Booking_Mail::get_active_mail_context()`

### PHP layer (`includes/`)

| Class | Role |
|-------|------|
| `HBE_Plugin` | Bootstrap, cancel page, mail wrappers, logo URL normalization |
| `HBE_Calendar_Post_Type` | Registers `hbe_calendar` CPT |
| `HBE_Calendar_Settings` | Per-calendar settings (availability, services, mail, SMTP) persisted via post meta |
| `HBE_Bookings` | Booking CRUD against custom table |
| `HBE_Bookings_Table` | `dbDelta` schema for bookings table |
| `HBE_Booking_Mail` | Sends confirmation/cancel mails via `wp_mail()` (SMTP delegated to external mail plugin) |
| `HBE_Admin` | Admin menu, asset enqueue for settings SPA & email designer |
| `HBE_REST` | REST endpoints consumed by public widget + admin SPA |

SMTP delivery intentionally delegates to site's active mail plugin — do not add a second SMTP layer.

### Frontend bundles

Three independent Vite configs, each emitting into shared `dist/` with `emptyOutDir: false`:

| Config | Entry | Output | Format |
|--------|-------|--------|--------|
| `vite.config.booking.ts` | `elements/booking/src/booking.ts` + `elements/booking/cancel/cancel.tsx` | `dist/booking.js`, `dist/cancel.js` | ES module |
| `vite.config.settings.ts` | `elements/booking/settings/settings.tsx` | `dist/settings.js` | IIFE |
| `vite.config.email-designer.ts` | `elements/booking/email-designer/email-designer.tsx` | `dist/email-designer.js` | IIFE |

Settings + email-designer are IIFE because they mount inside WordPress admin and must not leak module scope.

### Public booking widget

`elements/booking/class-booking.php` = Bricks element definition. Templates split into `col-calendar.php`, `col-services.php`, `col-slots.php`. Frontend TS in `elements/booking/src/booking.ts` drives stepper/inline layout via `data-layout-mode`, `data-stepper-panel`, `data-booking-state`. CSS uses custom properties like `--hbe-booking-panel-min-height` for height stability between states. Layout shifts between states (success/details/slots/availability) must be avoided — shared shell depends on consistent heights.

### Admin settings SPA

`elements/booking/settings/settings.tsx` mounts React + Ant Design. Key components in `settings/src/`:
- `SettingsApp.tsx` — shell, calendar list, routing between views
- `BookingView.tsx` — `react-big-calendar` booking overview with drag/drop/resize
- `CalendarSettingsPanel.tsx` — availability, services, mail, rules config
- `EmailDesigner.tsx` + `BookingEmailTemplate.tsx` — React-Email template editor
- `i18n.ts` — translations
- `SettingsApp.css` / `BookingCalendar.css` — shell + calendar styling; calendar layout stability depends on outer flex preserving fixed height

### Cancel flow

GET `?hbe_cancel_booking=1&id=...&cal=...&token=...` routed by `HBE_Plugin::handle_cancel_page()`. Token = `hash_hmac('sha256', "$booking_id:$calendar_id", wp_salt('auth'))`. Confirmation POST requires WP nonce. Renders bespoke HTML shell loading `dist/cancel.js` (React) with `window.hbeCancelData` payload.

## Conventions

- PHP class files: `includes/class-hbe-<name>.php`, class name `HBE_<Name>` (PSR-4 not used — WordPress-style include).
- PHP follows WordPress Coding Standards (`phpcs.xml` enforces `WordPress` ruleset + `WordPress.Files.FileName`).
- TypeScript: strict mode + `noUncheckedIndexedAccess`. Tab indent (Biome). Double quotes.
- Immutability enforced in TS code — use spread, not mutation.
- No `console.log` in committed code.
- Biome ignores `dist/` and `node_modules/`; respects `.gitignore` via `vcs.useIgnoreFile`.
- Build artifacts in `dist/` are committed (WordPress plugins ship built assets).

## Gotchas

- `emptyOutDir: false` across all three configs — running one Vite config alone will not wipe stale bundles from the others. Full `npm run build` rebuilds all three sequentially.
- Bricks element registration uses `init` priority 11 — Bricks itself registers earlier.
- Email logo URL normalization strips SVGs when a raster size exists (mail clients unreliable with SVG); falls through to raw SVG URL otherwise.
- Activation/upgrade only (re)creates the bookings table; schema changes require bumping `HBE_VERSION`.
- Cancel page returns HTTP 400 on error state, 200 otherwise — do not change status blindly.
