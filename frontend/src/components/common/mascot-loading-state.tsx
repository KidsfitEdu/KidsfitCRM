'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type MascotState = 'loading' | 'offline' | 'error';

/** Small vector mascot; separate eyes, wings and sleep marks animate without moving the card. */
function KidsfitOwl({ sleeping }: { sleeping: boolean }) {
  return (
    <svg viewBox="0 0 180 146" width="132" height="108"
      className={`mx-auto h-auto w-[112px] sm:w-[124px] ${sleeping ? 'crm-owl--sleeping' : 'crm-owl--working'}`}
      role="img" aria-label={sleeping ? 'Cú KIDSFIT đang ngủ gật' : 'Cú KIDSFIT đang làm việc'}>
      <defs>
        <linearGradient id="crm-owl-green" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#55DB27"/><stop offset="1" stopColor="#078638"/>
        </linearGradient>
        <linearGradient id="crm-owl-yellow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF35C"/><stop offset="1" stopColor="#FFB900"/>
        </linearGradient>
      </defs>
      <ellipse cx="90" cy="135" rx="58" ry="7" fill="#103C21" opacity=".10"/>
      {sleeping && <g className="crm-owl-zzz" fill="#16873B" fontFamily="sans-serif" fontWeight="bold">
        <text x="128" y="26" fontSize="14">Z</text><text x="144" y="15" fontSize="18">z</text>
      </g>}
      <g className="crm-owl-body">
        <path d="M46 51 33 11 Q48 20 61 32 Q90 18 119 32 Q133 18 148 11 L134 51 Q153 73 143 110 Q132 132 91 134 Q48 132 37 109 Q28 75 46 51Z"
          fill="url(#crm-owl-green)" stroke="#066C2E" strokeWidth="3" strokeLinejoin="round"/>
        <path d="M70 34 Q78 15 88 34 Q95 11 103 34 L112 25 Q113 49 91 65 L70 43Z"
          fill="url(#crm-owl-yellow)" stroke="#E9A600" strokeWidth="2" strokeLinejoin="round"/>
        <ellipse cx="90" cy="106" rx="37" ry="26" fill="#FFFDF0"/>
        <g className="crm-owl-wing-left"><path d="M41 87 Q15 81 29 109 Q41 123 55 109Z" fill="#18B83A" stroke="#086A30" strokeWidth="3"/></g>
        <g className="crm-owl-wing-right"><path d="M139 87 Q165 81 151 109 Q139 123 125 109Z" fill="#18B83A" stroke="#086A30" strokeWidth="3"/></g>
        <ellipse cx="63" cy="72" rx="33" ry="34" fill="#FFF" stroke="#075D30" strokeWidth="6"/>
        <ellipse cx="117" cy="72" rx="33" ry="34" fill="#FFF" stroke="#075D30" strokeWidth="6"/>
        {sleeping ? (
          <g fill="none" stroke="#312721" strokeWidth="4.5" strokeLinecap="round">
            <path d="M47 76 Q63 91 79 76"/><path d="M101 76 Q117 91 133 76"/>
          </g>
        ) : (
          <g className="crm-owl-eyes">
            <circle cx="66" cy="75" r="17" fill="#32241B"/><circle cx="114" cy="75" r="17" fill="#32241B"/>
            <circle cx="71" cy="68" r="7" fill="#FFF"/><circle cx="119" cy="68" r="7" fill="#FFF"/>
          </g>
        )}
        <path d="M79 94 Q90 85 101 94 L90 109Z" fill="url(#crm-owl-yellow)" stroke="#D98703" strokeWidth="2"/>
        {sleeping && <path d="M84 116 Q90 122 96 116" fill="none" stroke="#E28F10" strokeWidth="2" strokeLinecap="round"/>}
      </g>
      {sleeping ? (
        <path d="M27 125 Q30 112 47 115 H132 Q151 112 154 125 Q154 138 136 138 H44 Q27 138 27 125Z"
          fill="#FFF1B7" stroke="#D5B66F" strokeWidth="2"/>
      ) : (
        <g className="crm-owl-laptop">
          <rect x="49" y="110" width="82" height="29" rx="5" fill="#EDF3F2" stroke="#8CA5A0" strokeWidth="2"/>
          <path d="M44 140 H136" stroke="#557E71" strokeWidth="5" strokeLinecap="round"/>
          <circle cx="90" cy="123" r="7" fill="#1B8F3B"/>
          <path d="M88 118 L96 123 L88 128Z" fill="#FFF"/>
        </g>
      )}
    </svg>
  );
}

export function MascotLoadingState({
  state, detail, onRetry, fullScreen = true,
}: {
  state: MascotState;
  detail?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}) {
  const loading = state === 'loading';
  const title = loading ? 'Cú KIDSFIT đang chuẩn bị dữ liệu...'
    : state === 'offline' ? 'Ối! Cú đang ngủ mất rồi!'
    : 'Cú gặp một chút trục trặc!';
  const explanation = detail ?? (loading
    ? 'Vui lòng chờ một chút nhé!'
    : state === 'offline'
      ? 'Không thể kết nối đến máy chủ KIDSFIT CRM. Vui lòng kiểm tra mạng và thử lại.'
      : 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.');

  return (
    <section role={loading ? 'status' : 'alert'} aria-live={loading ? 'polite' : 'assertive'}
      aria-busy={loading}
      className={`${fullScreen ? 'min-h-screen' : 'min-h-[260px]'} flex items-center justify-center bg-background px-4 py-8 text-foreground`}>
      <div className="w-full max-w-[340px] rounded-2xl border border-border bg-card px-5 py-7 text-center shadow-sm">
        <div className="mb-3"><KidsfitOwl sleeping={!loading}/></div>
        <h2 className="text-base font-bold leading-6 text-foreground">{title}</h2>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{explanation}</p>
        {loading ? (
          <div className="mx-auto mt-4 w-40" aria-label="Đang tải dữ liệu, chưa xác định thời gian hoàn thành">
            <div className="h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
              <div className="crm-owl-progress h-full w-1/3 rounded-full bg-[#1B8F3B]"/>
            </div>
            <p className="mt-2 text-[11px] font-medium text-muted-foreground">Đang kết nối...</p>
          </div>
        ) : onRetry ? (
          <Button type="button" onClick={onRetry}
            className="mt-4 h-9 rounded-full bg-[#1b5e20] px-4 text-xs font-semibold text-white hover:bg-[#124c17]">
            <RefreshCw className="mr-2 size-3.5" aria-hidden="true"/>Thử kết nối lại
          </Button>
        ) : null}
      </div>
    </section>
  );
}
