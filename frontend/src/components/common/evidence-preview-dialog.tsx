'use client';

import { useEffect, useState } from 'react';
import { Download, Minus, Plus, RotateCcw, X, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type EvidencePreview = { url: string; name: string; mime: string };

/** Minimal authenticated blob viewer: images zoom in place, PDF keeps its browser-native viewer. */
export function EvidencePreviewDialog({ preview, onClose }: {
  preview: EvidencePreview | null;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  useEffect(() => { setScale(1); }, [preview?.url]);
  const image = Boolean(preview?.mime.startsWith('image/'));
  const zoom = (step: number) => setScale(current =>
    Math.max(0.5, Math.min(4, Math.round((current + step) * 100) / 100)));
  return <Dialog open={preview !== null} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent showCloseButton={false}
      className="flex h-[min(92dvh,900px)] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-xl border-border bg-background p-0 shadow-2xl sm:max-w-5xl">
      <DialogTitle className="sr-only">{preview?.name ?? 'Xem chứng từ'}</DialogTitle>
      <DialogDescription className="sr-only">Chứng từ riêng tư, chỉ sử dụng để đối soát.</DialogDescription>
      {preview && <>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-muted/30 p-3 sm:p-5"
          aria-label="Nội dung chứng từ">
          {image
            ? <div className="flex h-full min-h-0 w-full items-center justify-center overflow-auto">
                {/* Blob URLs are authenticated and cannot be passed through an image optimizer. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.url} alt={preview.name}
                  className="max-h-full max-w-full object-contain transition-transform duration-150"
                  style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}/>
              </div>
            : preview.mime === 'application/pdf'
              ? <iframe src={preview.url} title={preview.name}
                  className="h-full min-h-0 w-full rounded-md border bg-white"/>
              : <p role="status" className="text-sm text-muted-foreground">Không hỗ trợ xem trực tiếp định dạng này. Vui lòng tải tệp để xem.</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-background px-3 py-2 sm:px-5">
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={preview.name}>{preview.name}</span>
          <div className="flex items-center gap-1">
            {image && <>
              <Button variant="outline" size="icon" type="button" title="Thu nhỏ" aria-label="Thu nhỏ ảnh"
                disabled={scale <= 0.5} onClick={() => zoom(-0.25)}><Minus className="size-4"/></Button>
              <span className="w-12 text-center text-xs tabular-nums" aria-live="polite">{Math.round(scale*100)}%</span>
              <Button variant="outline" size="icon" type="button" title="Phóng to" aria-label="Phóng to ảnh"
                disabled={scale >= 4} onClick={() => zoom(0.25)}><ZoomIn className="size-4"/></Button>
              <Button variant="outline" size="icon" type="button" title="Về 100%" aria-label="Đặt lại kích thước ảnh"
                onClick={() => setScale(1)}><RotateCcw className="size-4"/></Button>
            </>}
            {!image && preview.mime === 'application/pdf' &&
              <span className="hidden text-xs text-muted-foreground sm:inline">Dùng thanh công cụ PDF để thu phóng</span>}
            <Button variant="outline" size="icon" type="button" asChild title="Tải chứng từ">
              <a href={preview.url} download={preview.name} aria-label="Tải chứng từ"><Download className="size-4"/></a>
            </Button>
            <Button variant="outline" size="icon" type="button" title="Đóng" aria-label="Đóng xem chứng từ"
              onClick={onClose}><X className="size-4"/></Button>
          </div>
        </div>
      </>}
    </DialogContent>
  </Dialog>;
}
