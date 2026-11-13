'use client';

import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { Download, Maximize2, Minus, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type EvidencePreview = { url: string; name: string; mime: string };
type Dimensions = { width: number; height: number };

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

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

  const zoom=(direction:number)=>{
    setZoomLevel(current=>Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,
      Math.round((current+direction)*100)/100)));
  };
  const onWheelZoom=(event:WheelEvent<HTMLDivElement>)=>{
    if (!image || !imageSize) return;
    if (event.ctrlKey) return;
    event.preventDefault();
    zoom(event.deltaY<0?ZOOM_STEP:-ZOOM_STEP);
  };
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
      className="flex h-[100dvh] max-h-none w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-[#191d22] p-0 shadow-2xl sm:h-[min(94dvh,1100px)] sm:w-[min(94vw,1500px)] sm:max-w-none sm:rounded-2xl">
      <DialogTitle className="sr-only">{preview?.name??'Xem chứng từ'}</DialogTitle>
      <DialogDescription className="sr-only">Xem chứng từ được bảo vệ theo quyền truy cập.</DialogDescription>
      {preview&&<>
        <div ref={stageRef} className="relative min-h-0 flex-1 overflow-auto overscroll-contain bg-[#242930]"
          aria-label="Nội dung chứng từ" onWheel={onWheelZoom}
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
          className="absolute right-4 top-4 z-20 size-10 rounded-full border-white/20 bg-[#15191f]/90 text-white shadow-lg hover:bg-[#303841] hover:text-white">
          <X aria-hidden="true" className="size-5"/>
        </Button>
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/15 bg-[#15191f]/95 px-2 py-1.5 text-white shadow-xl backdrop-blur-sm">
            {image&&<>
              <Button type="button" size="icon" variant="ghost" aria-label="Thu nhỏ ảnh" title="Thu nhỏ ảnh"
                className="size-9 text-white hover:bg-white/15 hover:text-white"
                disabled={zoomLevel<=MIN_ZOOM||!imageSize} onClick={()=>zoom(-ZOOM_STEP)}>
                <Minus aria-hidden="true" className="size-4"/>
              </Button>
              <span className="w-12 text-center text-xs tabular-nums" aria-live="polite">{Math.round(zoomLevel*100)}%</span>
              <Button type="button" size="icon" variant="ghost" aria-label="Phóng to ảnh" title="Phóng to ảnh"
                className="size-9 text-white hover:bg-white/15 hover:text-white"
                disabled={zoomLevel>=MAX_ZOOM||!imageSize} onClick={()=>zoom(ZOOM_STEP)}>
                <Plus aria-hidden="true" className="size-4"/>
              </Button>
              <Button type="button" size="icon" variant="ghost" aria-label="Vừa khung hình" title="Vừa khung hình"
                className="size-9 text-white hover:bg-white/15 hover:text-white"
                onClick={()=>setZoomLevel(1)}>
                <Maximize2 aria-hidden="true" className="size-4"/>
              </Button>
              <span aria-hidden="true" className="mx-1 h-5 w-px bg-white/20"/>
            </>}
            <a href={preview.url} download={preview.name} title="Tải chứng từ" aria-label="Tải chứng từ"
              className="inline-flex size-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <Download aria-hidden="true" className="size-4"/>
            </a>
          </div>
        </div>
      </>}
    </DialogContent>
  </Dialog>;
}
