'use client';

import { ClipboardCheck } from 'lucide-react';

type Props = {
  submittedBy?: string | null;
  managerName?: string | null;
  reviewDueAt?: string | null;
  proposalMode?: string | null;
  reason?: string | null;
  decisionReason?: string | null;
  possibleDuplicate?: boolean;
  /** Formatting stays with the existing workflow date utility in each caller. */
  formatReviewDueAt: (value: string) => string;
};

const missing = (value?: string | null) => value?.trim() || 'Chưa cập nhật';

const proposalModeLabel = (mode?: string | null) => {
  if (mode === 'ADD_BRANCHES') return 'Bổ sung phân hiệu vào trường hiện hữu';
  if (mode === 'NEW_MAIN') return 'Đề xuất trường chính mới';
  if (mode === 'LEGACY') return 'Hồ sơ đề xuất trước đây';
  return null;
};

function Field({ label, value }: { label: string; value?: string | null }) {
  return <div className="min-w-0 space-y-1">
    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
    <dd className="break-words text-sm font-medium leading-5 text-foreground">{missing(value)}</dd>
  </div>;
}

/** Consistent read-only proposal metadata below the shared school profile. */
export function SchoolProposalWorkflowDetails({
  submittedBy, managerName, reviewDueAt, proposalMode, reason,
  decisionReason, possibleDuplicate = false, formatReviewDueAt,
}: Props) {
  const modeLabel = proposalModeLabel(proposalMode);
  return <section aria-label="Thông tin xử lý đề xuất" className="min-w-0 space-y-3 rounded-2xl border border-border bg-card p-3.5 sm:p-4">
    <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
      <ClipboardCheck aria-hidden="true" className="size-4 shrink-0 text-primary"/>
      Thông tin xử lý đề xuất
    </h3>
    <dl className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 min-[400px]:grid-cols-2">
      <Field label="Người đề xuất" value={submittedBy}/>
      <Field label="Quản lý phụ trách" value={managerName}/>
      {reviewDueAt && <Field label="Hạn xử lý" value={formatReviewDueAt(reviewDueAt)}/>}
      {modeLabel && <div className="min-w-0 min-[400px]:col-span-2">
        <Field label="Loại đề xuất" value={modeLabel}/>
      </div>}
      {reason && <div className="min-w-0 min-[400px]:col-span-2">
        <Field label="Lý do đề xuất" value={reason}/>
      </div>}
      {decisionReason && <div className="min-w-0 min-[400px]:col-span-2">
        <Field label="Phản hồi phê duyệt" value={decisionReason}/>
      </div>}
    </dl>
    {possibleDuplicate && <p role="alert" className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-foreground">
      Có khả năng trùng tên/khu vực. Admin cần đối chiếu mã định danh.
    </p>}
  </section>;
}
