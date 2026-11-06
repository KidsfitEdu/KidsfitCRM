'use client';

import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { Download, Minus, RotateCcw, X, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type EvidencePreview = { url: string; name: string; mime: string };

/** Minimal authenticated blob viewer: images zoom in place, PDF keeps its browser-native viewer. */
export function EvidencePreviewDialog({ preview, onClose }: {
  preview: EvidencePreview | null;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  useEffect(() => { setScale(1); }, [preview?.url]);
  const image = Boolean(preview?.mime.startsWith('image/'));
  const zoom = (step: number) => setScale(current =>
    Math.max(0.5, Math.min(4, Math.round((current + step) * 100) / 100)));
  const onWheelZoom = (event: WheelEvent<HTMLDivElement>) => {
    if (!image) return;
    event.preventDefault();
    zoom(event.deltaY < 0 ? 0.25 : -0.25);
  };
  const beginDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!image || scale <= 1 || !stageRef.current) return;
    dragRef.current = { x: event.clientX, y: event.clientY,
      left: stageRef.current.scrollLeft, top: stageRef.current.scrollTop };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !stageRef.current) return;
    stageRef.current.scrollLeft = dragRef.current.left - event.clientX + dragRef.current.x;
    stageRef.current.scrollTop = dragRef.current.top - event.clientY + dragRef.current.y;
  };
  return <Dialog open={preview !== null} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent showCloseButton={false}
      className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-[#111318] p-0 shadow-2xl sm:h-[min(96dvh,1000px)] sm:w-[min(96vw,1400px)] sm:rounded-xl">
      <DialogTitle className="sr-only">{preview?.name ?? 'Xem chứng từ'}</DialogTitle>
      <DialogDescription className="sr-only">Chứng từ riêng tư, chỉ sử dụng để đối soát.</DialogDescription>
      {preview && <>
        <div ref={stageRef} className="min-h-0 flex-1 overflow-auto bg-[#111318] touch-pan-x touch-pan-y"
          aria-label="Nội dung chứng từ" onWheel={onWheelZoom}
          onPointerDown={beginDrag} onPointerMove={moveDrag}
          onPointerUp={() => { dragRef.current = null; }}
          onPointerCancel={() => { dragRef.current = null; }}
          style={{ cursor: image && scale > 1 ? 'grab' : 'default' }}>
          {image
            ? <div className="flex min-h-full min-w-full items-center justify-center"
                style={{ width: `${scale * 100}%`, height: `${scale * 100}%` }}>
                {/* Authenticated blob URL, no external image optimizer. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.url} alt={preview.name} draggable={false}
                  className="block max-h-full max-w-full select-none object-contain"
                  style={{ maxHeight: `${100 / scale}%`, maxWidth: `${100 / scale}%`,
                    transform: `scale(${scale})` }}/>
              </div>
            : preview.mime === 'application/pdf'
              ? <iframe src={preview.url} title={preview.name}
                  className="h-full min-h-0 w-full border-0 bg-white"/>
              : <p role="status" className="p-6 text-center text-sm text-white/70">Không hỗ trợ xem trực tiếp định dạng này. Vui lòng tải tệp để xem.</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#1c2027] px-3 py-2 text-white sm:px-5">
          <span className="min-w-0 flex-1 truncate text-xs text-white/70" title={preview.name}>{preview.name}</span>
          <div className="flex items-center gap-1">
            {image && <>
              <Button variant="outline" size="icon" type="button" className="border-white/20 bg-transparent text-white hover:bg-white/15 hover:text-white" title="Thu nhỏ" aria-label="Thu nhỏ ảnh"
                disabled={scale <= 0.5} onClick={() => zoom(-0.25)}><Minus className="size-4"/></Button>
              <span className="w-12 text-center text-xs tabular-nums" aria-live="polite">{Math.round(scale*100)}%</span>
              <Button variant="outline" size="icon" type="button" title="Phóng to" aria-label="Phóng to ảnh"
                disabled={scale >= 4} onClick={() => zoom(0.25)}><ZoomIn className="size-4"/></Button>
              <Button variant="outline" size="icon" type="button" title="Về 100%" aria-label="Đặt lại kích thước ảnh"
                onClick={() => setScale(1)}><RotateCcw className="size-4"/></Button>
            </>}
            {!image && preview.mime === 'application/pdf' &&
              <span className="hidden text-xs text-white/70 sm:inline">Dùng thanh công cụ PDF để thu phóng</span>}
            <a href={preview.url} download={preview.name} aria-label="Tải chứng từ" title="Tải chứng từ"
              className="inline-flex size-9 items-center justify-center rounded-md border border-white/20 text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <Download className="size-4"/>
            </a>
            <Button variant="outline" size="icon" type="button" title="Đóng" aria-label="Đóng xem chứng từ"
              onClick={onClose}><X className="size-4"/></Button>
          </div>
        </div>
      </>}
    </DialogContent>
  </Dialog>;
}
