# H Bricks Elements Repo Baseline

## Purpose

`h-bricks-elements` is a WordPress plugin that adds custom Bricks builder elements and an admin booking/calendar interface.

## Main Functional Areas

### 1. Booking element for the frontend

Location:
- `elements/booking/class-booking.php`
- `elements/booking/templates/*`
- `elements/booking/src/booking.ts`
- `elements/booking/src/booking.css`

What it does:
- Renders a public booking widget inside Bricks.
- Supports inline and stepper layouts.
- Lets visitors choose a date, available time slot, and booking details.
- Supports optional service selection and booking summaries.
- Shows a success state after a booking is created.
- Reads booking/calendar configuration from the WordPress side and consumes REST endpoints.

### 2. Booking/calendar admin UI

Location:
- `elements/booking/settings/settings.tsx`
- `elements/booking/settings/src/SettingsApp.tsx`
- `elements/booking/settings/src/BookingView.tsx`
- `elements/booking/settings/src/CalendarSettingsPanel.tsx`
- `elements/booking/settings/src/SettingsApp.css`
- `elements/booking/settings/src/BookingCalendar.css`

What it does:
- Mounts a React/Ant Design admin shell inside WordPress admin.
- Lets admins create, select, rename, configure, and delete calendars.
- Provides a booking overview/calendar view using `react-big-calendar`.
- Supports booking creation, editing, drag/drop, resize, and deletion.
- Exposes calendar settings such as availability, services, booking rules, and mail settings.

### 3. WordPress integration layer

Location:
- `includes/class-hbe-plugin.php`
- `includes/class-hbe-admin.php`
- `includes/class-hbe-bookings.php`
- `includes/class-hbe-calendar-post-type.php`
- `includes/class-hbe-calendar-settings.php`
- `includes/class-hbe-rest.php`
- `includes/class-hbe-bookings-table.php`

What it does:
- Boots the plugin and registers admin/frontend assets.
- Defines the calendar post type and booking-related storage/config.
- Registers REST endpoints used by both the public widget and admin React app.
- Handles admin pages, booking persistence, and list-table style admin views.

## Build And Tooling

Location:
- `package.json`
- `vite.config.booking.ts`
- `vite.config.settings.ts`
- `dist/*`

Current workflow:
- `npm run build` builds both frontend booking assets and admin settings assets through Vite.
- `npm run lint` / `npm run check` use Biome.
- Output bundles land in `dist/`.

## Current UI Surfaces Relevant To Calendar Work

### Public widget

Primary files:
- `elements/booking/src/booking.ts`
- `elements/booking/src/booking.css`

Important behaviors:
- Stepper state is driven in TypeScript and reflected with `data-layout-mode`, `data-stepper-panel`, and `data-booking-state`.
- Height and transitions are largely controlled by CSS custom properties such as `--hbe-booking-panel-min-height`.
- Success, details, slots, and availability states all share the same shell and can introduce layout shifts if heights differ.

### Admin calendar

Primary files:
- `elements/booking/settings/src/BookingView.tsx`
- `elements/booking/settings/src/BookingCalendar.css`
- `elements/booking/settings/src/SettingsApp.css`

Important behaviors:
- The admin calendar view uses `react-big-calendar` plus an optional right-side overview panel.
- Visual alignment with the shell depends on Ant Design token usage and the shell CSS variables in `SettingsApp.css`.
- Calendar layout stability depends on the outer flex container preserving a fixed available height.

## Start Point For The Current Task

Requested changes:
1. Align the admin calendar view more closely with the shell styling.
2. In the public booking widget, remove the “Next Availability” block.
3. Make the time-slot list consume the available height.
4. Keep the calendar/widget at a fixed height to reduce jumps.
5. Make the final success container narrower.
6. Prevent layout shifts between booking steps as much as possible.
