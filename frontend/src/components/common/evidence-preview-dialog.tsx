'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Download, Maximize2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type EvidencePreview = { url: string; name: string; mime: string };
type Dimensions = { width: number; height: number };

/** Private blob viewer: image starts fitted to the available stage, not at raw pixel resolution. */
export function EvidencePreviewDialog({ preview, onClose }: {
  preview: EvidencePreview | null;
  onClose: () => void;
}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imageSize, setImageSize] = useState<Dimensions|null>(null);
  const [stageSize, setStageSize] = useState<Dimensions>({width:0,height:0});
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{x:number;y:number;left:number;top:number}|null>(null);
  const image = Boolean(preview?.mime.startsWith('image/'));
  const pdf = preview?.mime === 'application/pdf';

  useEffect(() => {
    setZoomLevel(1);
    setImageSize(null);
    dragRef.current = null;
  }, [preview?.url]);

  useEffect(() => {
    const stage=stageRef.current;
    if(!stage || !preview || !image) return;
    const update=()=>setStageSize({width:stage.clientWidth,height:stage.clientHeight});
    update();
    const observer=new ResizeObserver(update);
    observer.observe(stage);
    return ()=>observer.disconnect();
  }, [preview?.url,image,preview]);

  const fitRatio=imageSize && stageSize.width>0 && stageSize.height>0
    ? Math.min(1, stageSize.width/imageSize.width, stageSize.height/imageSize.height)
    : 1;
  const width=imageSize ? Math.round(imageSize.width*fitRatio*zoomLevel) : 0;
  const height=imageSize ? Math.round(imageSize.height*fitRatio*zoomLevel) : 0;

  const beginDrag=(event:PointerEvent<HTMLDivElement>)=>{
    const stage=stageRef.current;
    if (!image || !stage || zoomLevel<=1 || event.button!==0) return;
    dragRef.current={x:event.clientX,y:event.clientY,left:stage.scrollLeft,top:stage.scrollTop};
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag=(event:PointerEvent<HTMLDivElement>)=>{
    const active=dragRef.current;
    const stage=stageRef.current;
    if(!active||!stage) return;
    stage.scrollLeft=active.left+active.x-event.clientX;
    stage.scrollTop=active.top+active.y-event.clientY;
  };
  const endDrag=(event:PointerEvent<HTMLDivElement>)=>{
    dragRef.current=null;
    if(event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return <Dialog open={preview!==null} onOpenChange={open=>{if(!open)onClose();}}>
    <DialogContent showCloseButton={false}
      className="flex h-[min(85dvh,650px)] max-h-[85dvh] w-[min(94vw,700px)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-2xl">
      <DialogTitle className="sr-only">{preview?.name??'Xem chứng từ'}</DialogTitle>
      <DialogDescription className="sr-only">Xem chứng từ được bảo vệ theo quyền truy cập.</DialogDescription>
      {preview&&<>
        <div ref={stageRef} className="relative min-h-0 flex-1 overflow-auto overscroll-contain bg-muted/30 p-0"
          aria-label="Nội dung chứng từ"
          onPointerDown={beginDrag} onPointerMove={moveDrag}
          onPointerUp={endDrag} onPointerCancel={endDrag}
          onDoubleClick={()=>{if(image)setZoomLevel(current=>current===1?2:1);}}
          style={{cursor:image&&zoomLevel>1?'grab':'default',touchAction:zoomLevel>1?'none':'pan-x pan-y'}}>
          {image
            ? <div className="flex items-center justify-center"
                style={{
                  minWidth:'100%',minHeight:'100%',
                  width:width>stageSize.width?width:undefined,
                  height:height>stageSize.height?height:undefined,
                }}>
                {/* Browser blob URL is already authenticated; keep native image pixels. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.url} alt={preview.name} draggable={false}
                  onLoad={event=>setImageSize({
                    width:event.currentTarget.naturalWidth,
                    height:event.currentTarget.naturalHeight
                  })}
                  className="block max-w-none select-none object-contain"
                  style={imageSize?{width,height}:{
                    maxWidth:'100%',maxHeight:'100%',width:'auto',height:'auto'
                  }}/>
              </div>
            :pdf
              ?<iframe src={preview.url} title={preview.name} className="h-full min-h-0 w-full border-0 bg-white"/>
              :<div role="status" className="flex h-full items-center justify-center p-6 text-center text-sm text-white/75">
                Định dạng này chưa hỗ trợ xem trực tiếp. Vui lòng tải tệp để xem.
              </div>}
        </div>
        <Button type="button" variant="outline" size="icon" onClick={onClose}
          title="Đóng xem chứng từ" aria-label="Đóng xem chứng từ"
          className="absolute right-2 top-2 z-20 size-9 rounded-full border-border/80 bg-background/90 text-foreground shadow-md hover:bg-muted">
          <X aria-hidden="true" className="size-5"/>
        </Button>
        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-card px-3 py-2">
          {image&&<Button type="button" size="sm" variant="outline"
            aria-label={zoomLevel===1?'Phóng to ảnh':'Vừa khung hình'}
            title={zoomLevel===1?'Phóng to ảnh':'Vừa khung hình'}
            onClick={()=>setZoomLevel(current=>current===1?2:1)}>
            <Maximize2 aria-hidden="true" className="size-4"/> {zoomLevel===1?'Phóng to':'Vừa khung'}
          </Button>}
          <a href={preview.url} download={preview.name} title="Tải chứng từ" aria-label="Tải chứng từ"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <Download aria-hidden="true" className="size-4"/> Tải xuống
          </a>
        </footer>
      </>}
    </DialogContent>
  </Dialog>;
}
