# KidsfitCRM domain and workflows

This reference is distilled from the supplied product requirement. Use it as a baseline for domain work, not as a mandate to implement out-of-scope features.

## Contents

- Domain model and ownership
- Status models
- Lead lifecycle
- Trial booking
- Lead conversion
- Enrollment and billing
- Activities, tasks, audit, and notifications
- Dashboard and reporting definitions

## Domain model and ownership

The core customer journey is:

```text
Lead -> Parent/Guardian -> Student -> Enrollment -> Invoice -> Payment -> Care
```

### CRM and identity

- `users`, `roles`, and `permissions` represent staff identity and authorization.
- `leads` represent prospective parent/guardian contacts before conversion.
- `lead_sources` and `lead_statuses` are configurable data. Do not hard-code display labels or source lists in application branches.
- `lead_assignments`, `lead_notes`, and `lead_activities` retain ownership and interaction history. If the implementation stores current assignment on `leads`, retain assignment history separately when reassignment history matters.

### Parent/guardian and student

- `parents` represent guardians/customers and primary contacts.
- `students` represent learners. Do not copy guardian contact fields into student records as the source of truth.
- `parent_student` represents the relationship, including `relationship` and `is_primary_contact`.
- Support multiple students per guardian and, where required, multiple guardians per student.
- Do not assume a phone number uniquely identifies one human or one household. Matching and merge rules must be explicit and reviewable.

### Course delivery

- `courses` are sellable educational products with name, duration/session count, tuition baseline, and status.
- `classes` are actual course cohorts with teacher, dates, capacity, and status.
- `class_schedules` contain recurring/local schedule facts such as weekday, start/end time, room, and teacher.
- `trial_sessions` are scheduled experiences connected to a lead and optionally a known student, course, and class.
- `enrollments` connect students to classes and capture the price agreed at registration.

### Billing

- `invoices` are receivables for a parent/student/enrollment.
- `invoice_items` explain invoice composition.
- `payments` are recorded payment facts. Provider attempts/callbacks may be modeled separately as `payment_transactions`.
- Keep historical invoice and payment records even when a student stops attending. Use statuses, reversals, or adjustments instead of destructive edits.

### Supporting records

- `tasks` represent follow-ups and may relate to a lead or parent through an explicit relation.
- `notifications` are user-facing delivery records, not the source of truth for a domain change.
- `audit_logs` capture actor, action, entity, before/after data, request metadata, and time for sensitive mutations.

## Baseline relational inventory

Use this inventory to preserve requirement intent when designing migrations. It is a logical baseline, not a substitute for normal keys, constraints, indexes, timestamps, tenant/branch scope, or fields already established by the codebase.

| Table | Baseline fields or purpose |
| --- | --- |
| `users`, `roles`, `permissions` | Staff identity and RBAC. Use the project's chosen role/permission relation tables. |
| `leads` | `id`, `code`, `full_name`, `phone`, `email`, `source_id`, `status_id`, `interested_course_id`, `assigned_user_id`, `note`, `next_follow_up_at`, `converted_parent_id`, timestamps |
| `lead_sources` | Configurable acquisition sources such as Facebook, TikTok, website, Zalo, referral, walk-in, and hotline |
| `lead_statuses` | Stable status code, localized label, ordering/active metadata as required |
| `lead_assignments` | Lead, assignee, assigning actor, effective time/history metadata |
| `lead_notes` | Lead, author, note content, timestamps and visibility if required |
| `lead_activities` | `id`, `lead_id`, `user_id`, `activity_type`, `content`, `created_at` |
| `parents` | `id`, `code`, `full_name`, `phone`, `secondary_phone`, `email`, `zalo`, `address`, `occupation`, `note`, timestamps |
| `students` | `id`, `code`, `full_name`, `date_of_birth`, `gender`, `school_name`, `school_grade`, `note`, `status`, timestamps |
| `parent_student` | `parent_id`, `student_id`, `relationship`, `is_primary_contact` |
| `courses` | `id`, `code`, `name`, `description`, `duration`, `number_of_sessions`, `tuition_fee`, `status` |
| `classes` | `id`, `course_id`, `code`, `name`, `teacher_id`, `start_date`, `end_date`, `capacity`, `status` |
| `class_schedules` | `id`, `class_id`, `day_of_week`, `start_time`, `end_time`, `room`, `teacher_id` |
| `trial_sessions` | `id`, `lead_id`, `student_id`, `course_id`, `class_id`, `scheduled_at`, `attendance_status`, `result`, `note`, `staff_id` |
| `enrollments` | `id`, `student_id`, `class_id`, `registered_by`, `registration_date`, `original_fee`, `discount_amount`, `final_fee`, `status`, `created_at` |
| `invoices` | `id`, `parent_id`, `student_id`, `enrollment_id`, `invoice_code`, `total_amount`, `discount_amount`, `final_amount`, `paid_amount`, `remaining_amount`, `status`, `issued_at`, `due_at`, `created_at` |
| `invoice_items` | `id`, `invoice_id`, `item_type`, `item_id`, `description`, `quantity`, `unit_price`, `amount` |
| `payments` | `id`, `invoice_id`, `parent_id`, `student_id`, `payment_method`, `amount`, `payment_date`, `reference_code`, `status`, `created_by`, `created_at` |
| `payment_transactions` | Gateway/provider attempts, external IDs, idempotency, request/callback state, verification, and failure details when online payment is implemented |
| `tasks` | `id`, `related_type`, `related_id`, `assigned_to`, `title`, `due_at`, `status`, `priority` |
| `notifications` | Recipient, channel/type, payload or template reference, delivery/read state, retry/failure metadata |
| `audit_logs` | `id`, `user_id`, `action`, `entity_type`, `entity_id`, `old_data`, `new_data`, `ip_address`, `user_agent`, `created_at` |

Use explicit foreign keys when the relation type is fixed. If polymorphic `related_type`/`related_id` is used for tasks or invoice items, constrain allowed types in application code and avoid accepting arbitrary class names from requests.

## Status models

### Lead

Canonical codes:

```text
NEW
CONTACTED
QUALIFIED
TRIAL_BOOKED
TRIAL_COMPLETED
CONSIDERING
WON
LOST
```

Normal progression:

```text
NEW -> CONTACTED -> QUALIFIED -> TRIAL_BOOKED
    -> TRIAL_COMPLETED -> CONSIDERING -> WON
```

Rules:

- The backend owns transition validation.
- `LOST` is a deliberate branch from an active stage and should capture a reason when the product supports it.
- Reopening a `LOST` lead or changing a `WON` lead requires a named action and appropriate permission; it is not a generic update.
- A Kanban move invokes the same transition action as any other UI.

### Trial attendance and result

Use stable machine codes and map them to localized UI labels. At minimum distinguish scheduled, attended, absent, cancelled, and rescheduled attendance when those cases are supported.

The original result concepts are:

```text
INTERESTED
NEEDS_CONSIDERATION
NOT_INTERESTED
```

Do not couple localized strings such as `Interested` or Vietnamese labels directly to control flow.

### Enrollment

Canonical codes:

```text
PENDING
ACTIVE
PAUSED
COMPLETED
CANCELLED
```

Transitions must account for class availability, dates, billing policy, and permissions. Cancellation does not delete the enrollment or its invoices/payments.

### Invoice and payment

Define invoice status from authoritative amounts and explicit lifecycle facts. Typical concepts are draft/issued, unpaid/partial/paid, overdue, cancelled, and refunded; use only codes actually adopted by the project.

Never infer successful payment solely from a client redirect or notification dispatch. Provider callbacks require signature verification and idempotent processing.

## Lead lifecycle

### Capture and assign

A lead normally includes a code, contact name, phone/email, source, status, course interest, current assignee, note, next follow-up time, and conversion trace.

Assignment should:

- require `crm.lead.assign` or the established equivalent;
- update current ownership;
- retain assignment/activity history;
- create an audit entry;
- notify the new assignee after commit if notifications are enabled.

### Record interactions and follow-up

Interaction types originate from stable codes such as:

```text
CALL
MESSAGE
ZALO
EMAIL
MEETING
NOTE
TRIAL
STATUS_CHANGE
```

An interaction timeline should preserve actor, time, type, and content. A scheduled follow-up should create or update a task and the lead's next-follow-up projection consistently rather than maintaining two unrelated facts.

## Trial booking

`Book Trial` is a business action, not a generic lead update.

Expected behavior:

1. Validate lead eligibility, student details, course/class, capacity or scheduling rules, and actor permission.
2. Create the trial session.
3. Transition the lead to `TRIAL_BOOKED` when valid.
4. Create a lead activity and audit record.
5. Optionally create a confirmation task due before the session.
6. Emit `TrialBooked` after commit for notifications or reminders.

Updating attendance/result should also record activity/audit and apply only valid lead transitions. An interested attended trial may move from `TRIAL_COMPLETED` to `CONSIDERING`; do not infer a result before staff records it.

## Lead conversion

`Convert Lead` is a named, atomic, retry-safe action.

The wizard may gather:

1. Parent/guardian information
2. Student information
3. Course
4. Class
5. Tuition and discount
6. Initial payment information, if included in the requested scope

Within one transaction, create or deliberately link:

```text
Parent
Student
ParentStudent
Enrollment
Invoice + InvoiceItems
Lead conversion trace
Activity/Audit records
```

Then transition the lead to `WON`. If any required write fails, roll back the complete conversion. On retry, return or continue the established conversion rather than creating duplicates.

Record `converted_parent_id` or an equivalent immutable link so acquisition source and history remain traceable. If one lead can produce multiple students or enrollments, introduce an explicit conversion relationship instead of overloading one column.

Initial payment is included in the same transaction only when it is an internal cash/manual record whose success is already known. External gateway processing is a separate idempotent workflow.

## Enrollment and billing

Enrollment stores the commercial snapshot:

```text
original_fee
discount_amount
final_fee
```

Required arithmetic:

```text
final_fee = original_fee - discount_amount
remaining_amount = final_amount - paid_amount
```

Compute and validate these values on the server with exact decimal/integer arithmetic. Do not trust totals sent by the browser. Preserve invoice item composition and do not silently rewrite historical prices when a course's current tuition changes.

Recording a payment should:

- verify invoice/customer context and permission;
- reject or explicitly handle overpayment according to policy;
- create an immutable payment or reversal record;
- update/recalculate invoice aggregates consistently;
- audit the actor and source;
- emit post-commit events for receipt/notification delivery.

## Activities, tasks, audit, and notifications

Use the following consistency sequence:

```text
User action
  -> authorized business action
  -> domain validation
  -> database mutation + activity/audit
  -> commit
  -> event/queue
  -> notification or integration
```

- Activity answers what happened in the customer relationship.
- Audit answers who changed protected system data, when, and from what to what.
- Task answers what a staff member needs to do and by when.
- Notification answers what was delivered or shown to a recipient.

Do not collapse these into one generic table when their retention, access, or behavior differs.

## Dashboard and reporting definitions

The sales dashboard should be based on explicit, testable time and ownership definitions. Baseline widgets include:

- new leads;
- follow-ups due today;
- trials awaiting attendance/result;
- trials scheduled today;
- overdue follow-ups.

Define timezone, inclusive date boundaries, active statuses, assignee scope, and whether completed/cancelled tasks count. Avoid duplicating metric logic independently in controllers, exports, and UI widgets.
