'use client';

import {useRef, useState} from 'react';
import {CloudUpload, FileImage, RefreshCw, Trash2} from 'lucide-react';

const ALLOWED_TYPES=['image/jpeg','image/png','image/webp'];
const MAX_PROOF_SIZE=5*1024*1024;
const displaySize=(bytes:number)=>bytes>=1024*1024
  ?(bytes/(1024*1024)).toLocaleString('vi-VN',{maximumFractionDigits:1})+' MB'
  :(bytes/1024).toLocaleString('vi-VN',{maximumFractionDigits:0})+' KB';

/** Keep the real, named file input in the form for the existing receipt API. */
export function AccountingReceiptProofUpload({disabled=false,error,onFileSelected}:{
  disabled?:boolean;error?:string;onFileSelected:(selected:boolean)=>void;
}){
  const inputRef=useRef<HTMLInputElement>(null);
  const [file,setFile]=useState<File|null>(null);
  const [localError,setLocalError]=useState('');
  const clearFile=()=>{
    if(inputRef.current)inputRef.current.value='';
    setFile(null);
    setLocalError('');
    onFileSelected(false);
  };
  const chooseFile=(newFile:File|undefined)=>{
    if(!newFile){clearFile();return;}
    if(!ALLOWED_TYPES.includes(newFile.type)){
      clearFile();
      setLocalError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.');
      return;
    }
    if(newFile.size===0||newFile.size>MAX_PROOF_SIZE){
      clearFile();
      setLocalError(newFile.size===0?'Ảnh chứng từ không được để trống.':'Ảnh chứng từ không được vượt quá 5 MB.');
      return;
    }
    setFile(newFile);
    setLocalError('');
    onFileSelected(true);
  };

  return <div className="min-w-0 space-y-2">
    <input ref={inputRef} id="accounting-bank-proof" name="proof" type="file" required
      accept="image/jpeg,image/png,image/webp" disabled={disabled}
      aria-invalid={Boolean(error||localError)}
      aria-describedby={localError?'accounting-proof-local-error':'accounting-proof-hint'}
      className="sr-only" onChange={event=>chooseFile(event.currentTarget.files?.[0])}/>
    {file
      ?<div className="rounded-xl border border-border bg-card px-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-primary">
            <FileImage className="size-5" aria-hidden="true"/>
          </div>
          <div className="min-w-0 flex-1">
            <p className="break-all text-sm font-semibold">{file.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{displaySize(file.size)} · Đã chọn</p>
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-3 border-t border-border/60 pt-2 text-sm">
          <button type="button" disabled={disabled} onClick={()=>inputRef.current?.click()}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 font-medium text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
            <RefreshCw className="size-4" aria-hidden="true"/> Thay ảnh
          </button>
          <button type="button" disabled={disabled} onClick={clearFile}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
            <Trash2 className="size-4" aria-hidden="true"/> Xóa ảnh
          </button>
        </div>
      </div>
      :<button type="button" disabled={disabled} onClick={()=>inputRef.current?.click()}
        className="flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card px-4 py-3 text-center transition-colors hover:border-primary/60 hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60">
        <CloudUpload className="mb-1 size-5 text-muted-foreground" aria-hidden="true"/>
        <span className="text-sm font-semibold">Chọn ảnh chứng từ</span>
        <span id="accounting-proof-hint" className="text-xs text-muted-foreground">JPG, PNG, WEBP · Tối đa 5 MB</span>
      </button>}
    {localError&&<p role="alert" id="accounting-proof-local-error" className="text-xs text-destructive">{localError}</p>}
    {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}
