'use client';

import { RefreshCw, LoaderCircle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

type MascotState = 'loading' | 'offline' | 'error';

export function MascotLoadingState({
  state, detail, onRetry, fullScreen = true,
}: {
  state: MascotState;
  detail?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}) {
  const loading = state === 'loading';
  const title = loading ? 'Cú KIDSFIT đang chuẩn bị dữ liệu!'
    : state === 'offline' ? 'Ối! Cú đang ngủ mất rồi!'
    : 'Cú gặp một chút trục trặc!';
  const explanation = detail ?? (loading
    ? 'Vui lòng chờ một chút, hệ thống đang kết nối máy chủ...'
    : state === 'offline'
      ? 'KIDSFIT CRM chưa thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.'
      : 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.');
  return (
    <section role={loading ? 'status' : 'alert'} aria-live={loading ? 'polite' : 'assertive'}
      aria-busy={loading} className={`${fullScreen ? 'min-h-screen' : 'min-h-[320px]'} flex items-center justify-center bg-background px-5 py-10 text-foreground`}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card px-6 py-9 text-center shadow-lg sm:px-10">
        <div className={`mx-auto mb-5 w-40 sm:w-44 ${loading ? 'motion-safe:animate-[mascot-float_3s_ease-in-out_infinite]' : ''}`}>
          <img src="/branding/kidsfit-mascot.webp" width={176} height={155} alt="Mascot Cú KIDSFIT"
            className="h-auto w-full object-contain" decoding="async"/>
        </div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{explanation}</p>
        {loading ? (
          <div className="mt-5 inline-flex items-center gap-2 text-sm text-primary">
            <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin"/>
            Đang kết nối...
          </div>
        ) : (
          <div className="mt-5 flex flex-col items-center gap-3">
            <WifiOff aria-hidden="true" className="size-5 text-muted-foreground"/>
            {onRetry && <Button type="button" onClick={onRetry}
              className="rounded-xl bg-[#1b5e20] text-white hover:bg-[#124c17]">
              <RefreshCw className="mr-2 size-4" aria-hidden="true"/>Thử kết nối lại
            </Button>}
          </div>
        )}
      </div>
    </section>
  );
}
