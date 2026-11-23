'use client';

import { Building2, MapPin, Network } from 'lucide-react';

export type SchoolProfileUnit = {
  id: number;
  name: string;
  unit_type: string;
  province?: string | null;
  ward?: string | null;
  address?: string | null;
  contact_name?: string | null;
  contact_position?: string | null;
  contact_phone?: string | null;
  school_phone?: string | null;
  email?: string | null;
  note?: string | null;
};

type Props = {
  units: SchoolProfileUnit[];
  /** Shown only when supplied by a permission-scoped school detail response. */
  schoolCode?: string | null;
  statusLabel?: string | null;
};

const missing = (value?: string | null) => value?.trim() || 'Chưa cập nhật';
const address = (unit: SchoolProfileUnit) =>
  missing([unit.address, unit.ward, unit.province].filter(Boolean).join(', '));

function SchoolField({label, value}: {label: string; value?: string | null}) {
  return <div className="min-w-0 space-y-1">
    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
    <dd className="break-words text-sm font-medium leading-5 text-foreground">{missing(value)}</dd>
  </div>;
}

function SchoolFields({unit}: {unit: SchoolProfileUnit}) {
  return <dl className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 min-[400px]:grid-cols-2">
    <SchoolField label="Địa chỉ" value={address(unit)}/>
    <SchoolField label="Điện thoại trường" value={unit.school_phone}/>
    <SchoolField label="Người liên hệ" value={unit.contact_name}/>
    <SchoolField label="Chức vụ" value={unit.contact_position}/>
    <SchoolField label="Điện thoại liên hệ" value={unit.contact_phone}/>
    <SchoolField label="Email" value={unit.email}/>
    {unit.note && <div className="min-w-0 min-[400px]:col-span-2">
      <SchoolField label="Ghi chú" value={unit.note}/>
    </div>}
  </dl>;
}

/** Render a main school exactly once; callers must not duplicate it in the branch list. */
export function SchoolMainInfo({unit}: {unit: SchoolProfileUnit}) {
  return <section aria-label="Thông tin trường chính" className="space-y-3 rounded-2xl border border-border bg-card p-3.5 sm:p-4">
    <h3 className="flex items-center gap-2 text-sm font-bold">
      <Building2 aria-hidden="true" className="size-4 shrink-0 text-primary"/>
      Thông tin trường chính
    </h3>
    <SchoolFields unit={unit}/>
  </section>;
}

/** Only branch units belong in this section. Existing MAIN units must never repeat. */
export function SchoolBranchDetails({units}: {units: SchoolProfileUnit[]}) {
  const branches = units.filter(unit => unit.unit_type === 'BRANCH');
  return <section aria-label="Phân hiệu" className="space-y-3 rounded-2xl border border-border bg-card p-3.5 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex min-w-0 items-center gap-2 text-sm font-bold">
        <Network aria-hidden="true" className="size-4 shrink-0 text-primary"/>
        Phân hiệu
      </h3>
      <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
        {branches.length} phân hiệu
      </span>
    </div>
    {branches.length === 0
      ? <p className="rounded-xl bg-muted/40 px-3 py-4 text-sm text-muted-foreground">Trường chưa có phân hiệu.</p>
      : <div className="space-y-2.5">
        {branches.map((unit, index) => <section key={unit.id > 0 ? unit.id : `branch-${index}`}
          className="min-w-0 space-y-3 rounded-xl border border-border/80 bg-muted/15 p-3 sm:p-4">
          <div className="flex min-w-0 items-start gap-2">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary"/>
            <h4 className="min-w-0 break-words text-sm font-semibold leading-5">
              {unit.name?.trim() || `Phân hiệu ${index + 1}`}
            </h4>
          </div>
          <SchoolFields unit={unit}/>
        </section>)}
      </div>}
  </section>;
}

/** Shared read-only profile for Admin directory, Sales/CTV and proposal-review drawers. */
export function SchoolProfileDetails({units, schoolCode, statusLabel}: Props) {
  const main = units.find(unit => unit.unit_type === 'MAIN');
  return <div className="min-w-0 space-y-3 text-sm">
    {main && <section className="flex min-w-0 items-start gap-3 rounded-2xl border border-border bg-card p-3.5 sm:p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Building2 aria-hidden="true" className="size-5"/>
      </span>
      <div className="min-w-0 space-y-1">
        <p className="break-words text-base font-bold leading-6">{missing(main.name)}</p>
        {schoolCode && <p className="break-all text-xs text-muted-foreground">{schoolCode}</p>}
        {statusLabel && <span className="inline-flex max-w-full rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
          {statusLabel}
        </span>}
      </div>
    </section>}
    {main ? <SchoolMainInfo unit={main}/>
      : <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
          Chưa có thông tin trường chính trong phạm vi hồ sơ được phép xem.
        </p>}
    <SchoolBranchDetails units={units}/>
  </div>;
}
