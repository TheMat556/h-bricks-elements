# AGENTS.md

Compact reference for OpenCode sessions in this repo.

## What this is

WordPress plugin adding a custom Bricks Builder element (`h-booking-calendar`) plus an admin booking/calendar SPA. PHP handles WP integration (CPT, REST, mail, cancel flow). TypeScript/React builds three separate frontend bundles into `dist/`.

## Commands

**Frontend (Vite + Biome + Vitest, via bun):**
- `bun install`
- `bun run dev` — watch-build all three bundles in parallel
- `bun run build` — production build (sequential: booking → settings → email-designer)
- `bun run check` / `bun run check:fix` — Biome lint + format + organize imports
- `bun run lint` — Biome lint only
- `bun run format` — Biome format write
- `bun run format:check` — Biome format check only (dry-run)
- `bun run test` — run Vitest test suite
- `bun run coverage` — run Vitest with coverage report (thresholds: 80%)

**PHP (WordPress Coding Standards + PHPUnit):**
- `composer install`
- `composer lint` — `phpcs` against `elements/` and `plugin.php` per `phpcs.xml`
- `composer lint:fix` — `phpcbf`
- `composer test` — run PHPUnit test suite

## Build system

`scripts/build.ts` drives Vite for three independent targets, each with its own `outDir` and `emptyOutDir: true`:

| Target | Entry | Output | Format |
|--------|-------|--------|--------|
| `booking` | `elements/booking/src/booking.ts` + `elements/booking/cancel/cancel.tsx` | `dist/booking/booking.js`, `dist/booking/cancel.js` | ES module |
| `settings` | `elements/booking/settings/settings.tsx` | `dist/settings/settings.js` | IIFE |
| `email-designer` | `elements/booking/email-designer/email-designer.tsx` | `dist/email-designer/email-designer.js` | IIFE |

Settings + email-designer use IIFE because they mount inside WP admin and must not leak module scope.

`bun run build` runs the targets sequentially; `bun run dev` watches all three in parallel. PHP enqueues reference the subdir paths (e.g. `dist/booking/booking.js`).

## CI

`.github/workflows/lint.yml` runs on push/PR:
- Frontend: `bun install` → `biome ci .`
- PHP: `composer install` → `vendor/bin/phpcs --warning-severity=0`

No PHPUnit or Vitest tests run in CI — only lint/format. Tests are local-only.

## PHP conventions

- Class files: `includes/class-hbe-<name>.php`, class name `HBE_<Name>`. No PSR-4 autoloading — WordPress-style `require_once`.
- `phpcs.xml` enforces `WordPress` ruleset on `elements/`, `includes/`, and `plugin.php`.
- `plugin.php` defines constants (`HBE_PLUGIN_FILE`, `HBE_PLUGIN_DIR`, `HBE_PLUGIN_URL`, `HBE_VERSION`), requires all `includes/class-hbe-*.php` with `HBE_Plugin` LAST, then calls `HBE_Plugin::boot()`.
- Bricks element registration hooks `init` at priority **11** (Bricks registers earlier).
- Activation hook (`HBE_Plugin::activate()`) creates custom bookings table via `HBE_Bookings_Table::maybe_create()` and flushes rewrite rules. `maybe_upgrade()` re-runs install when `hbe_plugin_version` mismatches `HBE_VERSION`. **Schema changes require bumping `HBE_VERSION`.**
- SMTP delivery delegates to the site's active mail plugin — **do not add a second SMTP layer**.
- Cancel flow uses `hash_hmac('sha256', "$booking_id:$calendar_id", wp_salt('auth'))`. Confirmation POST requires WP nonce. Cancel page returns HTTP 400 on error, 200 otherwise.
- `%i` table-name placeholder in `$wpdb->prepare()` requires WordPress 6.2+. Plugin header specifies `Requires at least: 6.2`.
- All `includes/` PHP files and `tests/php/HBE_Rest_Cancel_Test.php` use `declare(strict_types=1);`.
- PHP enqueues use `filemtime()` for cache busting on dist assets.
- Admin bundle script tags get `type="module"` injected via `script_loader_tag` filter.

## TypeScript conventions

- Strict mode + `noUncheckedIndexedAccess`. Tab indent. Double quotes.
- Immutability enforced — use spread, avoid mutation.
- No `console.log` in committed code.
- Biome ignores `dist/` and `node_modules/`; respects `.gitignore` via `vcs.useIgnoreFile`.

## Architecture notes

**PHP layer (`includes/`):**
- `HBE_Plugin` — bootstrap, cancel page, mail wrappers, logo URL normalization
- `HBE_Calendar_Post_Type` — registers `hbe_calendar` CPT
- `HBE_Calendar_Settings` — per-calendar settings (availability, services, mail) via post meta
- `HBE_Bookings` — booking CRUD against custom table
- `HBE_Bookings_Table` — `dbDelta` schema
- `HBE_Booking_Mail` — sends confirmation/cancel mails via `wp_mail()`
- `HBE_Admin` — admin menu, asset enqueue for settings SPA & email designer
- `HBE_REST` — REST endpoints consumed by public widget + admin SPA

**Public booking widget:**
- `elements/booking/class-booking.php` = Bricks element definition.
- Templates: `col-calendar.php`, `col-services.php`, `col-slots.php`.
- Frontend TS drives stepper/inline layout via `data-layout-mode`, `data-stepper-panel`, `data-booking-state`.
- CSS uses custom properties like `--hbe-booking-panel-min-height` to prevent layout shifts between states.

**Admin settings SPA (`elements/booking/settings/`):**
- `SettingsApp.tsx` — shell, calendar list, routing
- `BookingView.tsx` — `react-big-calendar` overview with drag/drop/resize
- `CalendarSettingsPanel.tsx` — availability, services, mail, rules
- `EmailDesigner.tsx` + `BookingEmailTemplate.tsx` — React-Email template editor
- Calendar layout stability depends on outer flex preserving fixed height.

## Testing conventions

**TypeScript (Vitest + jsdom):**
- Test files: `tests/ts/**/*.test.ts` or `*.test.tsx`
- Coverage: 80% threshold (lines, functions, branches, statements)
- Coverage exclude list is **extensive** — many modules intentionally excluded (mount points, UI shells, untested modules). Adding coverage requires updating `vitest.config.ts`.
- Run: `bun run test` or `bun run coverage`

**PHP (PHPUnit 10):**
- Test files: `tests/php/*_Test.php` (suffix conventions)
- Custom bootstrap at `tests/php/bootstrap.php` stubs WordPress globals — no real WP install needed
- `wp_mail` is stubbed with a capture log
- Run: `composer test`

## TRICKY_FIXES.md

`TRICKY_FIXES.md` documents design decisions and security fixes. **Useful reference for why things work the way they do, but do not take claims at face value.** Several entries describe changes that were planned but never implemented:

| Entry | Claim | Reality |
|-------|-------|---------|
| #11 | Vite configs emit to subdirs with `emptyOutDir: true` | Implemented via `scripts/build.ts` |
| #12 | Coverage exclusions cleaned up | Still has extensive exclude list |
| #17 | `declare(strict_types=1)` added | Present in all `includes/` files |
| #18 | `Requires at least: 6.2` in plugin header | Present in `plugin.php` |
| #20 | `phpcs.xml` includes `includes/` | `includes/` is linted |

Always verify against the actual source files before acting on a TRICKY_FIXES claim.

## Verified facts vs. stale claims

- `.gitignore` ignores `dist/`. Do not assume `dist/` is tracked or needs to be committed unless you verify otherwise.
- `CLAUDE.md` exists with more prose; this file prioritizes executable facts and constraints.
- Plugin version header says `0.0.1`. Update both `Version:` in the docblock and `HBE_VERSION` constant when bumping.
- No database migrations framework — schema changes handled via `HBE_VERSION` bump + `maybe_upgrade()` + `dbDelta`.
- No `.opencode/config.json` or `opencode.json` exists in this repo.
