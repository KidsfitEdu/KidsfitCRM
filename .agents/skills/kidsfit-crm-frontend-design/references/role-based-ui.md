# Role-based UI contract

**Target business design (2026-10-30):** seven roles. Read \`docs/requirements/ROLES_AND_PERMISSIONS.md\` and \`CODEBASE_GAP_ANALYSIS.md\` for authoritative rights and current runtime gaps. A frontend role label does **not** grant backend rights. Always intersect user capabilities with row/organization scope returned by the server.

| Target role | UX priority | Must not expose by default |
| --- | --- | --- |
| \`ADMIN\` | Directory, proposals forwarded by Managers, staff/capacity, operating policy, audits | Routine contract approval/verification as an Admin-only obligation |
| \`DIRECTOR\` (BGĐ KIDSFIT) | Oversight, exceptions, SLA, disputes, policy decisions | Required per-contract signoff action; direct editing of financial ledger |
| \`ACCOUNTANT\` | Receipts, balance, reconciliation, versioned commission and payout | Other partner's confidential contacts beyond necessary finance scope |
| \`SALES_MANAGER\` | Assigned team, proposals, allocation, extension, contract quality and **submit to CHECKEE** | Cross-partner data or authority based on role name alone |
| \`CUSTOMER_SERVICE\` | Verified customer handoff, open cases, follow-ups | Changing Sales ownership/commission independently |
| \`CHECKEE\` | Verification queue, supporting evidence, return for correction, verify/reject, reconciliation | KIDSFIT internal commission/payout/personal salary unless explicit approved access |
| \`SALES\` | Discover/register school, accept allocation, contact history, progress, extension, contract creation, **own** finance | Other Sales' protected contacts, manager/admin approval, another Sales' income |

## Org-scoped manager and Sales

- KIDSFIT and partner Managers use the **same \`SALES_MANAGER\` business role**, with separate permitted teams and organizations. Both can send checked contract documentation directly to CHECKEE according to approved business process.
- Employee and collaborator share **\`SALES\`** business functionality (both may self-register or receive schools, default 10 simultaneously). Their employee/collaborator distinction is a membership attribute, not separate authorization role.
- This is the target UI. Existing code still has \`BOARD\`, \`CHANNEL_SALES\`, \`PARTNER_ADMIN\`, \`PARTNER_COLLABORATOR\`, separate Staff/Collaborator workspaces and demo profiles. **Do not remove/rename/migrate these in a design-only task**; stage a tested migration separately.

## Interaction/visibility rules

- Server capability + row scope gates action visibility and data requests. Client side only improves experience; it cannot be the authorization boundary.
- \`PENDING_ADMIN\` proposal is actionable by Admin (after manager review), not directly by Sales. Manager may review and forward Sales submission, not add canonical schools itself.
- Status \`CONTRACTED\` requires CHECKEE verification **and** authorized KIDSFIT grant for 5-year protection. Which KIDSFIT account receives the post-verification grant permission is **OPEN**; do not show an unapproved role-specific "Cấp bảo vệ" button.
- Sales commission is **provisionally 30%** only; never label as approved payout or calculate real earnings from screenshot assumptions. Record amount, collected amount, commission accrued, approved and paid distinctly.
- On inactive employee/CTV handoff, keep prior histories and legitimate commissions, do not transfer historical earning rights to new Sales/CSKH automatically.
- Privacy: show school directory summary to eligible users, protected contacts/attachments only to active owner, authorized manager, CHECKEE verifier or assigned care team according to scoped policy. Mask PII in previews, screenshots and fixtures.

## Seven-role navigation rollout

When an explicitly approved code migration happens, consolidate Staff and Collaborator navigation into one Sales workspace and alias legacy codes with scoped permissions. Preserve stable deep links or provide redirects, maintain menu item identity, and write tests for both old/new tokens across organizations. Documentation alone must not suggest migration is complete.
