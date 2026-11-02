'use client';

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
};

/** Shared read-only school / branch profile for Directory and My Schools. */
export function SchoolProfileDetails({ units }: Props) {
  return (
    <section className="space-y-3 text-sm">
      <h3 className="text-base font-semibold">Thông tin trường chính và trường điểm / phân hiệu</h3>
      {units.map(unit => (
        <section key={unit.id} className="rounded-xl border p-4">
          <p className="font-semibold">
            {unit.name}{' '}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {unit.unit_type === 'MAIN' ? 'Trường chính' : 'Trường điểm / Phân hiệu'}
            </span>
          </p>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div><p className="text-xs text-muted-foreground">Địa chỉ</p><p>{[unit.address, unit.ward, unit.province].filter(Boolean).join(', ') || 'Chưa cập nhật'}</p></div>
            <div><p className="text-xs text-muted-foreground">Người liên hệ / Chức vụ</p><p>{[unit.contact_name, unit.contact_position].filter(Boolean).join(' · ') || 'Chưa cập nhật'}</p></div>
            <div><p className="text-xs text-muted-foreground">Điện thoại liên hệ</p><p>{unit.contact_phone || 'Chưa cập nhật'}</p></div>
            <div><p className="text-xs text-muted-foreground">Điện thoại trường</p><p>{unit.school_phone || 'Chưa cập nhật'}</p></div>
            <div><p className="text-xs text-muted-foreground">Email</p><p className="break-all">{unit.email || 'Chưa cập nhật'}</p></div>
            {unit.note && <div><p className="text-xs text-muted-foreground">Ghi chú thông tin trường</p><p>{unit.note}</p></div>}
          </div>
        </section>
      ))}
      {units.length === 0 && <p className="text-muted-foreground">Chưa có thông tin đơn vị.</p>}
    </section>
  );
}
