import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImageViewer({ src, alt, onClose }: ImageViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog ref={dialogRef} className="mise-image-viewer" aria-label={`查看图片：${alt}`} onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <header className="mise-image-viewer-toolbar">
        <p>{alt}</p>
        {!failed && <button type="button" aria-label={expanded ? '适应屏幕' : '放大图片'} onClick={() => setExpanded(!expanded)}>{expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}<span>{expanded ? '适应屏幕' : '放大'}</span></button>}
        <button type="button" aria-label="关闭图片" onClick={onClose} autoFocus><X size={22} /></button>
      </header>
      <div className={`mise-image-viewer-body ${expanded ? 'is-expanded' : ''}`} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        {failed ? <p role="alert">暂时无法加载图片，请关闭后重试。</p> : <img src={src} alt={alt} referrerPolicy="no-referrer" onError={() => setFailed(true)} />}
      </div>
    </dialog>
  );
}
