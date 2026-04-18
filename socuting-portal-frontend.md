# Scouting Portal — Frontend Spec

Frontend plan for the scouting portal backed by the `fellowship-applications`, `fellowships`, and `fellowship-reports` APIs on `feat/scouting-portal`.

- **Base URL:** same origin as existing admin-backend; all endpoints require `Authorization: Bearer <jwt>`.
- **Roles:** `USER` (fellow/applicant) and `ADMIN`.
- **Enums:**
  - `FellowshipType`: `DEVELOPER | DESIGNER | EDUCATOR`
  - `FellowshipApplicationStatus`: `DRAFT | SUBMITTED | ACCEPTED | REJECTED`
  - `FellowshipStatus`: `PENDING | ACTIVE | COMPLETED`
  - `FellowshipReportStatus`: `DRAFT | SUBMITTED | APPROVED | REJECTED`
- **Pagination:** list endpoints return `{ totalRecords, records }`; query with `page` (0-indexed) + `pageSize`.

---

## Screen 1 — Fellow: Apply for Fellowship

**Route:** `/scouting/apply`
**Role:** `USER`
**Purpose:** Let a user pick a fellowship type, write a proposal, save as draft, and submit.

**Layout**
- Type selector (radio/cards): Developer / Designer / Educator — disabled if the user already has a `DRAFT` or `SUBMITTED` application for that type.
- Proposal editor (markdown textarea, large).
- Actions: `Save draft`, `Submit application`. `Submit` is disabled until proposal is non-empty and a draft exists.
- Side panel: "My applications" (small list fed by `GET /fellowship-applications/me`) with status chips. Clicking a `DRAFT` row loads it into the editor; `SUBMITTED` / `ACCEPTED` / `REJECTED` open a read-only view with `reviewerRemarks` if present.

**API calls**
| Action | Call |
|---|---|
| Load my applications | `GET /fellowship-applications/me?page=0&pageSize=20` |
| Open a draft | `GET /fellowship-applications/:id` + `GET /fellowship-applications/:id/proposal` |
| Create draft | `POST /fellowship-applications` body `{ type, proposal }` |
| Save draft | `PATCH /fellowship-applications/:id` body `{ proposal }` |
| Submit | `POST /fellowship-applications/:id/submit` |
| Discard draft | `DELETE /fellowship-applications/:id` |

**States & UX rules**
- Only one active (`DRAFT` or `SUBMITTED`) application per type — enforce in UI by disabling used types.
- After submit: show toast "Application submitted — check your email", switch screen to read-only view, refresh list.
- On `REJECTED`: show `reviewerRemarks` in a red callout and allow the user to start a new application for the same type.

---

## Screen 2 — Fellow: My Fellowship Dashboard

**Route:** `/scouting/fellowships/:id`
**Role:** `USER` (owner)
**Purpose:** After acceptance, the user completes onboarding, tracks contract state, and sees their monthly reports.

**Layout** (three sections, vertical)
1. **Header card:** fellowship type, status badge (`PENDING` = "Awaiting contract", `ACTIVE` = date range + `amountUsd`, `COMPLETED` = "Closed"), created date.
2. **Onboarding form:** collapsible section. All fields optional, editable anytime pre-`COMPLETED`. Sections:
   - *Profile:* `githubProfile`, `location`, `academicBackground`, `graduationYear` (int ≥1900), `professionalExperience`
   - *Project:* `projectName`, `projectGithubLink`, `mentorContact`
   - *Skills (array chips):* `domains[]`, `codingLanguages[]`, `educationInterests[]`
   - *Bitcoin:* `bitcoinContributions`, `bitcoinMotivation`, `bitcoinOssGoal`
   - *Other:* `additionalInfo`, `questionsForBitshala`
   - Submit via `PATCH /fellowships/:id/onboarding` — send only changed fields.
3. **Reports table:** months between `startDate` and `endDate` as rows; each row shows status chip + `View` / `Write report` CTA. "Write report" only enabled when status is `ACTIVE` and that month has no existing report. Click opens Screen 3.

**API calls**
- `GET /fellowships/me` — dashboard entry list (if user has multiple fellowships).
- `GET /fellowships/:id` — this view.
- `PATCH /fellowships/:id/onboarding` — partial update.
- `GET /fellowship-reports/me?page=0&pageSize=24` — to mark which months are filed.

**States & UX rules**
- Show a banner on `PENDING`: "Your application is accepted. An admin will start your contract soon."
- Disable reports CTA unless status is `ACTIVE`.
- `amountUsd` is a string (decimal); format as `$X,XXX.XX USD`.

---

## Screen 3 — Fellow: Submit Monthly Report

**Route:** `/scouting/fellowships/:fellowshipId/reports/:id?` (omit id to create new)
**Role:** `USER` (owner of the fellowship)
**Purpose:** Write a monthly progress report, save drafts, submit for review.

**Layout**
- Header: fellowship project name + "{Month Name} {Year}" with month/year pickers (only shown when creating new; locked after create).
- Content editor (markdown) — large.
- Sidebar: past reports list, each linking to the read-only view.
- If `REJECTED`: show reviewer remarks in a red card at top + allow creating a new report for the same month.
- Actions: `Save draft`, `Submit`, `Delete draft` (only if `DRAFT`).

**API calls**
| Action | Call |
|---|---|
| Create draft | `POST /fellowship-reports` body `{ fellowshipId, month: 1-12, year ≥ 2020, content }` |
| Load | `GET /fellowship-reports/:id` + `GET /fellowship-reports/:id/content` |
| Save | `PATCH /fellowship-reports/:id` body `{ content }` |
| Submit | `POST /fellowship-reports/:id/submit` |
| Delete | `DELETE /fellowship-reports/:id` |

**States & UX rules**
- Lock content editing when status is not `DRAFT`.
- After submit show "Submitted for review" and disable all edit actions.
- On reminder email click-through (20th/25th/28th of month, noon IST), deep-link here for the current month.

---

## Screen 4 — Admin: Applications Review

**Route:** `/admin/scouting/applications`
**Role:** `ADMIN`
**Purpose:** Triage incoming applications and accept/reject.

**Layout**
- Filters bar: `status` (default `SUBMITTED`), `type` (All / Developer / Designer / Educator), pagination controls.
- Table columns: Applicant name, Type, Status chip, Submitted at (`createdAt`), Reviewed by, Actions (`Review`).
- Right-side drawer on row click:
  - Header: applicant, type, status.
  - Proposal viewer (markdown-rendered, read-only) loaded from `/:id/proposal`.
  - If `SUBMITTED`: two buttons — `Accept` (no remarks required) / `Reject` (opens dialog forcing `reviewerRemarks` ≥ 1 char).
  - If already reviewed: show reviewer name + remarks, no action buttons.

**API calls**
- `GET /fellowship-applications?page&pageSize&status&type`
- `GET /fellowship-applications/:id` + `GET /fellowship-applications/:id/proposal`
- `PATCH /fellowship-applications/:id/review` body `{ status: ACCEPTED | REJECTED, reviewerRemarks? }`

**States & UX rules**
- List endpoint excludes `DRAFT` by default — no filter option for it.
- On `ACCEPTED`: toast "Fellowship created in PENDING state" — link to Screen 5 filtered to this new fellowship.
- Confirm `REJECTED` with a typed remarks textarea; backend rejects empty remarks — mirror with client-side required validation.

---

## Screen 5 — Admin: Fellowships Management

**Route:** `/admin/scouting/fellowships`
**Role:** `ADMIN`
**Purpose:** See all fellowships and start the contract for `PENDING` ones.

**Layout**
- Table: Fellow name, Type, Status, Start–End, `amountUsd`, Project name, Actions.
- Row click opens detail drawer with the full onboarding payload from `GET /fellowships/:id` (read-only view of everything from Screen 2 onboarding).
- For `PENDING` rows the detail drawer shows a `Start contract` form:
  - `startDate` (date picker, ISO-8601)
  - `endDate` (date picker, must be > startDate — client validation)
  - `amountUsd` (number, positive, max 2 decimals)
  - Submit button — single-use per fellowship; disable once status flips to `ACTIVE`.

**API calls**
- `GET /fellowships?page&pageSize`
- `GET /fellowships/:id`
- `PATCH /fellowships/:id/start-contract` body `{ startDate, endDate, amountUsd }`

**States & UX rules**
- Client-side guard: calling `start-contract` twice is a backend error — grey out the button once the row is `ACTIVE`.
- Show "Awaiting onboarding" indicator when fellowship is `ACTIVE` but core onboarding fields (e.g. `projectName`, `githubProfile`) are null — informational only, doesn't block anything.

---

## Screen 6 — Admin: Reports Review

**Route:** `/admin/scouting/reports`
**Role:** `ADMIN`
**Purpose:** Review monthly reports submitted by fellows.

**Layout**
- Filters: `status` (default `SUBMITTED`), `month`, `year`, pagination.
- Table: Fellow, Month/Year, Status, Submitted at, Reviewed by, Actions.
- Row drawer:
  - Header: fellow name, month, year, status.
  - Content viewer (markdown) from `GET /:id/content`.
  - Actions (only on `SUBMITTED`): `Approve` (no remarks required) / `Reject` (dialog with required `reviewerRemarks`).
  - On already-reviewed rows: reviewer + remarks, read-only.

**API calls**
- `GET /fellowship-reports?page&pageSize&status&month&year`
- `GET /fellowship-reports/:id` + `GET /fellowship-reports/:id/content`
- `PATCH /fellowship-reports/:id/review` body `{ status: APPROVED | REJECTED, reviewerRemarks? }`

**States & UX rules**
- `DRAFT`s are excluded from the admin list by design.
- Default the month/year filters to current month for the "what needs reviewing right now" view.
- After approve/reject show toast; fellow gets an email automatically (backend handles).

---

## Shared frontend concerns

- **Auth guard:** Screens 1–3 require `USER`; Screens 4–6 require `ADMIN`. Reuse whatever role-gate component exists in portal-unified.
- **Status chips:** define a single `<StatusChip status={...} />` component that handles all four status enums with color mapping (draft=grey, submitted/pending=amber, accepted/active/approved=green, rejected=red, completed=blue).
- **Error handling:** surface backend `message` field from 400/403/404 responses as inline form errors or toasts; do not swallow.
- **Markdown:** proposals and report content are free-form markdown — pick one renderer (e.g. `react-markdown` with a safe sanitizer) and reuse across Screens 1, 3, 4, 6.
- **Optimistic UI:** avoid it for status transitions (submit/review/start-contract) — always await server response; these are low-frequency, correctness-critical actions.
- **Pagination default:** `pageSize=20` for application/report tables, `pageSize=50` for fellowships (lower churn).
