import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Check, RotateCcw } from 'lucide-react';

type Size = { width: number; height: number };
type Position = { x: number; y: number };

interface CoverImageEditorProps {
  image: string;
  onCancel: () => void;
  onConfirm: (image: string) => void;
}

const OUTPUT_WIDTH = 1200;

export function CoverImageEditor({ image, onCancel, onConfirm }: CoverImageEditorProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; position: Position } | null>(null);
  const pointersRef = useRef(new Map<number, Position>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const [naturalSize, setNaturalSize] = useState<Size | null>(null);
  const [stageSize, setStageSize] = useState<Size | null>(null);
  const [coverScale, setCoverScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [ratio, setRatio] = useState<'original' | 'landscape' | 'square' | 'portrait'>('original');
  const zoomId = useId();
  const aspectRatio = ratio === 'original' ? (naturalSize ? naturalSize.width / naturalSize.height : 4 / 3) : ratio === 'square' ? 1 : ratio === 'portrait' ? 3 / 4 : 4 / 3;

  useLayoutEffect(() => {
    const source = imageRef.current;
    if (source?.complete && source.naturalWidth && source.naturalHeight) {
      setNaturalSize({ width: source.naturalWidth, height: source.naturalHeight });
    }
  }, [image]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || !naturalSize) return;

    const measure = () => {
      const rect = stage.getBoundingClientRect();
      const nextStage = { width: rect.width, height: rect.height };
      setStageSize(nextStage);
      setCoverScale(Math.max(nextStage.width / naturalSize.width, nextStage.height / naturalSize.height));
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [naturalSize, aspectRatio]);

  const constrainPosition = (nextZoom: number, nextPosition: Position): Position => {
    if (!naturalSize || !stageSize) return nextPosition;
    const renderedWidth = naturalSize.width * coverScale * nextZoom;
    const renderedHeight = naturalSize.height * coverScale * nextZoom;
    const maxX = Math.max(0, (renderedWidth - stageSize.width) / 2);
    const maxY = Math.max(0, (renderedHeight - stageSize.height) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, nextPosition.x)),
      y: Math.min(maxY, Math.max(-maxY, nextPosition.y)),
    };
  };

  const handleZoom = (nextZoom: number) => {
    setZoom(nextZoom);
    setPosition((current) => constrainPosition(nextZoom, current));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()];
      pinchRef.current = {
        distance: Math.hypot(first.x - second.x, first.y - second.y),
        zoom,
      };
      dragRef.current = null;
      return;
    }
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, position };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    const pinch = pinchRef.current;
    if (pinch && pointersRef.current.size >= 2) {
      const [first, second] = [...pointersRef.current.values()];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      if (pinch.distance > 0) {
        handleZoom(Math.min(3, Math.max(1, pinch.zoom * (distance / pinch.distance))));
      }
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPosition(constrainPosition(zoom, {
      x: drag.position.x + event.clientX - drag.x,
      y: drag.position.y + event.clientY - drag.y,
    }));
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const apply = () => {
    const source = imageRef.current;
    if (!source || !stageSize || !naturalSize) {
      onConfirm(image);
      return;
    }

    if (ratio === 'original' && zoom === 1) {
      onConfirm(image);
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_WIDTH;
      canvas.height = Math.round(OUTPUT_WIDTH / aspectRatio);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas context is unavailable');

      const outputScale = OUTPUT_WIDTH / stageSize.width;
      const renderedWidth = naturalSize.width * coverScale * zoom;
      const renderedHeight = naturalSize.height * coverScale * zoom;
      const left = stageSize.width / 2 - renderedWidth / 2 + position.x;
      const top = stageSize.height / 2 - renderedHeight / 2 + position.y;
      context.drawImage(
        source,
        left * outputScale,
        top * outputScale,
        renderedWidth * outputScale,
        renderedHeight * outputScale,
      );
      onConfirm(canvas.toDataURL('image/jpeg', 0.9));
    } catch (error) {
      console.warn('封面图片裁剪失败，保留原图：', error);
      onConfirm(image);
    }
  };

  const renderedWidth = naturalSize ? naturalSize.width * coverScale * zoom : 0;
  const renderedHeight = naturalSize ? naturalSize.height * coverScale * zoom : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="封面裁剪比例">
        {([{ id: 'original', label: '原比例' }, { id: 'landscape', label: '横图 4:3' }, { id: 'square', label: '方图 1:1' }, { id: 'portrait', label: '竖图 3:4' }] as const).map((option) => <button key={option.id} type="button" aria-pressed={ratio === option.id} onClick={() => setRatio(option.id)} className={`min-h-10 rounded border px-3 text-xs ${ratio === option.id ? 'border-primary bg-primary text-white' : 'border-divider text-secondary'}`}>{option.label}</button>)}
      </div>
      <div
        ref={stageRef}
        className="relative w-full touch-none overflow-hidden rounded-lg bg-[#EAE6DE]"
        style={{ aspectRatio, maxWidth: `${55 * aspectRatio}dvh`, marginInline: 'auto' }}
        tabIndex={0}
        role="group"
        aria-label="封面裁剪区域，可拖动图片或使用方向键调整位置"
        onKeyDown={(event) => {
          const directions: Record<string, Position> = { ArrowLeft: { x: -12, y: 0 }, ArrowRight: { x: 12, y: 0 }, ArrowUp: { x: 0, y: -12 }, ArrowDown: { x: 0, y: 12 } };
          const direction = directions[event.key];
          if (!direction) return;
          event.preventDefault();
          setPosition((current) => constrainPosition(zoom, { x: current.x + direction.x, y: current.y + direction.y }));
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <img
          ref={imageRef}
          src={image}
          crossOrigin="anonymous"
          alt="调整封面图片"
          draggable={false}
          onLoad={(event) => setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
          className="absolute left-1/2 top-1/2 max-w-none select-none"
          style={{
            width: `${renderedWidth}px`,
            height: `${renderedHeight}px`,
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
          }}
        />
        <div className="pointer-events-none absolute inset-0 border-2 border-white/90 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.42)]" />
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
          {[...Array(9)].map((_, index) => (
            <span
              key={index}
              className={`border-white/35 ${index % 3 !== 2 ? 'border-r' : ''} ${index < 6 ? 'border-b' : ''}`}
            />
          ))}
        </div>
        <span className="pointer-events-none absolute -left-0.5 -top-0.5 h-4 w-4 border-l-2 border-t-2 border-white" />
        <span className="pointer-events-none absolute -right-0.5 -top-0.5 h-4 w-4 border-r-2 border-t-2 border-white" />
        <span className="pointer-events-none absolute -bottom-0.5 -left-0.5 h-4 w-4 border-b-2 border-l-2 border-white" />
        <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-4 w-4 border-b-2 border-r-2 border-white" />
        <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 text-xs text-white">拖动图片调整位置</p>
      </div>

      <div className="flex items-center gap-3"><label htmlFor={zoomId} className="text-xs text-secondary">缩放</label><input id={zoomId} aria-label="封面缩放" type="range" min="1" max="3" step="0.02" value={zoom} onChange={(event) => handleZoom(Number(event.target.value))} className="min-w-0 flex-1 accent-[#89734f]" /><button type="button" onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }} className="min-h-10 px-2 text-xs text-secondary">重置</button></div>
      <p className="text-center text-xs leading-5 text-secondary">拖动调整位置，也可双指缩放。选择原比例并保持 1 倍缩放可保留完整图片。</p>

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex flex-1 items-center justify-center gap-2 rounded-input border border-divider py-3 text-secondary">
          <RotateCcw className="h-4 w-4" />取消
        </button>
        <button type="button" onClick={apply} disabled={!naturalSize || !stageSize} className="flex flex-1 items-center justify-center gap-2 rounded-input bg-primary py-3 text-white disabled:opacity-40">
          <Check className="h-4 w-4" />{ratio === 'original' && zoom === 1 ? '保留原图' : '使用裁剪'}
        </button>
      </div>
    </div>
  );
}
