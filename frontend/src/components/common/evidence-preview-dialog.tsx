'use client';

import { Download, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type EvidencePreview = { url: string; name: string; mime: string };

/** Display private evidence at its natural aspect ratio without padding or toolbars. */
export function EvidencePreviewDialog({ preview, onClose }: {
  preview: EvidencePreview | null;
  onClose: () => void;
}) {
  const isImage = Boolean(preview?.mime.startsWith('image/'));
  const isPdf = preview?.mime === 'application/pdf';

  return <Dialog open={preview!==null} onOpenChange={open=>{if(!open)onClose();}}>
    <DialogContent showCloseButton={false}
      className={`fixed top-1/2 left-1/2 flex w-fit max-w-[min(92vw,560px)] max-h-[80dvh] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0 overflow-hidden overscroll-contain rounded-2xl border-0 bg-transparent p-0 shadow-2xl sm:p-0 ${isImage?'':'w-[min(92vw,560px)]'}`}>
      <DialogTitle className="sr-only">{preview?.name??'Xem chứng từ'}</DialogTitle>
      <DialogDescription className="sr-only">Xem chứng từ được bảo vệ theo quyền truy cập.</DialogDescription>
      {preview&&<div className="relative min-h-0 w-full overflow-hidden rounded-2xl">
        {isImage
          ? <>
              {/* Authenticated blob URL stays private; intrinsic image ratio determines the modal size. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.url} alt={preview.name}
                className="mx-auto block h-auto max-h-[80dvh] w-auto max-w-full select-none object-contain"
                draggable={false}/>
            </>
          :isPdf
            ?<iframe src={preview.url} title={preview.name}
              className="block h-[min(85dvh,780px)] w-full border-0 bg-white"/>
            :<div role="status" className="flex min-h-48 items-center justify-center bg-card p-6 text-center text-sm text-foreground">
              Định dạng này chưa hỗ trợ xem trực tiếp. Vui lòng tải tệp để xem.
            </div>}
        <Button type="button" variant="outline" size="icon" onClick={onClose}
          title="Đóng xem chứng từ" aria-label="Đóng xem chứng từ"
          className="absolute right-2 top-2 z-10 size-9 rounded-full border-white/60 bg-background/90 text-foreground shadow-md hover:bg-background">
          <X aria-hidden="true" className="size-5"/>
        </Button>
        <a href={preview.url} download={preview.name} title="Tải chứng từ" aria-label="Tải chứng từ"
          className="absolute bottom-2 right-2 z-10 inline-flex size-10 items-center justify-center rounded-full border border-white/60 bg-background/90 text-foreground shadow-md transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <Download aria-hidden="true" className="size-5"/>
        </a>
      </div>}
    </DialogContent>
  </Dialog>;
}
