# University OS — Freemium Beta (development branch)

This branch replaces the original personal prototype with a generic app. It has no embedded timetable, fixed exam milestones, private course names or personal task data.

## Implemented
- Email/password signup and login via Supabase Auth (email confirmation according to Supabase settings)
- Row-level-security protected per-user JSON workspace
- Editable semester, courses, timetable meetings, tasks/exams, lecture journals, and resource links
- FREE quotas: 5 courses, 30 tasks, 15 lecture journals, 15 resources; 2 themes
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
