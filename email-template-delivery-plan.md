# Email Template Delivery Plan

## Goal
Make the email designed in the admin settings page the single source of truth for customer booking emails, and implement a reliable mail sending flow with clear failure handling, validation, and verification.

## Tasks
- [ ] Task 1: Define one canonical template contract for the designer and sender in `elements/booking/settings/src/EmailDesigner.tsx`, `elements/booking/settings/src/BookingEmailTemplate.tsx`, `elements/booking/settings/src/SettingsApp.tsx`, `includes/class-hbe-calendar-settings.php`, and `includes/class-hbe-plugin.php` so the same variables and HTML assumptions exist on both sides. → Verify: document the exact placeholder list (`{{logoUrl}}`, `{{customerName}}`, `{{calendarName}}`, `{{date}}`, `{{time}}`, `{{service}}`, `{{location}}`, `{{cancelUrl}}`) and confirm every placeholder is produced by the React renderer and filled by PHP.
- [ ] Task 2: Move template compilation into a dedicated shared save pipeline so every calendar save produces a persisted, non-empty `compiledHtml` and stores a template version/hash alongside it. → Verify: saving a calendar updates `compiledHtml` deterministically in the stored settings and a second save without changes produces the same hash/version.
- [ ] Task 3: Add server-side template validation before persistence in `includes/class-hbe-calendar-settings.php` so malformed or incomplete compiled HTML is rejected instead of silently saved. → Verify: invalid payloads return a REST error, valid payloads preserve expected HTML structure, and required placeholders remain present after sanitization.
- [ ] Task 4: Refactor `includes/class-hbe-plugin.php` and `includes/class-hbe-rest.php` to use one shared render-and-send service that loads the saved compiled template, injects runtime booking variables, resolves the logo, sets HTML headers, and never falls back to a different layout. → Verify: test mail and real booking mail both pass through the same renderer and produce matching HTML except for sample vs booking data.
- [ ] Task 5: Add delivery guards and observability around sending: skip send when mail is disabled, return structured errors when template data is missing, log template version/hash and mail outcome, and hook `wp_mail_failed` with calendar/booking context. → Verify: logs clearly show which calendar/template was used, why a send failed, and whether the template was missing, invalid, or mail transport failed.
- [ ] Task 6: Implement a robust send function boundary with `prepare_booking_email()` and `send_booking_email()` responsibilities separated so rendering, header creation, and transport are testable independently. → Verify: unit-level checks can validate subject, recipients, headers, rendered body, and error states without actually sending mail.
- [ ] Task 7: Add an admin-side “template status” indicator on the settings page that shows whether the current designer state is compiled, stale, or invalid before the user clicks save. → Verify: editing the designer marks status as stale, successful save marks it compiled, and invalid compile shows a visible error before send is attempted.
- [ ] Task 8: Add a preview parity check for the test-email route so the admin preview HTML and the outgoing test-email HTML are generated from the same compiled source, not two separate branches. → Verify: sending a test mail after save yields markup matching the saved preview snapshot for the same placeholder data.
- [ ] Task 9: Add verification coverage for the whole flow: React compile/save path, REST persistence, PHP render injection, logo resolution, and test/live send path. → Verify: automated tests cover successful save/send, empty compiled template rejection, invalid placeholder rejection, and logo fallback behavior.
- [ ] Task 10: Verification last: rebuild assets, run PHP syntax checks, exercise one full manual flow in WordPress, and compare saved designer output against the received email source. → Verify: `npm run build` passes, `php -l` passes on touched PHP files, saving a template persists `compiledHtml`, sending a test email works, and a real booking email matches the designer output structure.

## Done When
- [ ] The customer email uses only the admin-designed template, with no alternate layout path.
- [ ] Saving settings always persists a valid compiled template for the selected calendar.
- [ ] Test email and live booking email share the same rendering pipeline.
- [ ] Delivery failures are explicit, logged, and diagnosable.
- [ ] The full flow is covered by automated checks and one manual end-to-end verification.

## Notes
- Critical design choice: treat `compiledHtml` as a build artifact of the designer, not as optional mail content.
- Critical design choice: keep one placeholder contract and one renderer path for preview, test mail, and live mail.
- Critical design choice: if the template is stale or invalid, block sending and surface the reason instead of silently degrading to plain text or a second layout.
