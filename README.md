# University OS — Freemium Beta (development branch)

This branch replaces the original personal prototype with a generic app. It has no embedded timetable, fixed exam milestones, private course names or personal task data.

## Implemented
- Email/password signup and login via Supabase Auth (email confirmation according to Supabase settings)
- Row-level-security protected per-user JSON workspace
- Editable semester, courses, timetable meetings, tasks/exams, lecture journals, and resource links
- FREE: unlimited courses, tasks and resource links; 20 lecture journals and 2 themes
- PRO entitlement read from a protected table, higher quotas and 6 themes
- JSON export/import
- Mobile responsive layout

## Setup required before running
1. Create your own Supabase project. Enable email provider in Auth, configure confirmed redirect URLs and application domain.
2. Run \`supabase/schema.sql\` in SQL Editor. Review the RLS policies and grants.
3. Enter the **public project URL** and **public anon/publishable key** in \`config.js\`.
   Never add your \`service_role\` key to a public repository.
4. Serve with an HTTP server and test with two separate email accounts.
5. Deploy only after checking sign-up, sign-in/out, account isolation, limits, backups and mobile UX.

## Payments — intentionally NOT live
\`paymentEnabled\` is false. The PRO button is disabled until a **real server-side checkout endpoint and signed webhook** are implemented and configured with the seller's legal/payment provider account. Client-side changes must never unlock a PRO account. Never accept a plan from the browser as authoritative.

Recommended backend flow:
1. User clicks PRO → authenticated server endpoint creates a checkout session with the provider.
2. Provider returns to your site; this return alone does not grant PRO.
3. Verified, idempotent server webhook confirms paid transaction.
4. Server updates \`entitlements\` using secure server credentials; browser refreshes plan.
5. Refunds/cancellations/expiration revoke or adjust entitlements.

## Security / privacy notes
- RLS blocks users reading each other's workspaces.
- FREE quotas are checked **again on the database** by a trigger.
- The source repository is public; don't assume UI-hidden features are protected intellectual property.
- For a production service, add deletion workflow, privacy policy, terms, password recovery UX, transaction records, monitoring, strong import validation, schema migration, payment/refund flows, and security/QA tests.
- Old personal data **still exists in the main branch and Git history**. Do not publish/share the original repository as a sanitized app. Remove/rewrite sensitive history separately after making backups and considering GitHub forks/caches. This branch does not alter original history.

## Project files
- \`index.html\`: responsive layout
- \`app.js\`: application and authentication integration
- \`config.js\`: public runtime config placeholder (no secrets)
- \`supabase/schema.sql\`: database, RLS and quotas

This is a beta implementation, not an operational paid service.

## Current demo preview (no accounts required)
- Download `demo.html` from this branch and open it locally in a modern browser. It runs entirely in the browser with a separate `uos-demo-v1` localStorage key. No signup, Supabase, or payment configuration is required for the demo.
- The demo can switch FREE/PRO for display testing; this is **not** a real subscription.
- Create subjects with weekday, start/end time and room; the weekly timetable updates automatically. Add multiple meetings to one subject, edit/remove meetings and see overlapping class warnings.
- Use complete edit forms for tasks, lecture notes and material links; calendars include class schedules and dated tasks; home includes overdue tasks and today's meetings.
- Editing records at the FREE journal limit must stay possible, while creating a 21st note is blocked.
- Local browser storage is **not** synced to the production app. Export JSON before clearing browser site data.

## QA checklist before release
- [ ] Sign up / login / logout with two different accounts and validate user-specific data isolation
- [ ] Add, edit, delete and persist course meetings; validate overlapping and overnight input behavior
- [ ] Test same course meeting multiple weekdays, mobile timetable horizontal scrolling, calendar month navigation
- [ ] Edit all task/note/material fields, including when FREE limit has been reached
- [ ] Test JSON import/export with valid, malformed and oversized files; add strict import schema validation
- [ ] Verify keyboard navigation, screen reader labels and responsive layout in browsers
- [ ] Validate database-side FREE cap and protected PRO plan changes
- [ ] Implement and test checkout only after trusted webhook and merchant account setup
- [ ] Remove original personalized content from public main and commit history safely

### Automated checks performed
The app and demo JavaScript were parsed successfully with a JavaScript syntax check. End-to-end browser interaction, accessibility and live Supabase/payment QA have **not** been completed.

## Backup import regression checks

Run `node --test tests/backup-validation.test.cjs` from the repository root. The tests extract the production validator from `app.js` and cover valid FREE imports, PRO themes, incorrect meeting times, unsafe URLs, duplicate IDs and the 20-journal limit. The import UI also rejects files larger than 2 MB before parsing. These checks do not substitute for live account isolation or browser E2E testing.

## Repeating assignments and searchable records

- Tasks now support one-time, weekly, and daily schedules. Repeating tasks use a per-date completion map, so checking one week does not complete subsequent weeks. The home dashboard shows overdue one-off work and upcoming repeated instances; the calendar renders occurrences for each date.
- Lecture Journal can be filtered by title, text, course, or date, and Materials by name, URL, or course.
- Repeat-task regression tests: `node --test tests/recurring-tasks.test.cjs` (run from repo root). Backups accept legacy tasks without a `repeat` field.
- Remaining QA: real browser end-to-end interaction, search field accessibility, multi-account Supabase tests, payment integration and original public Git history cleanup.
