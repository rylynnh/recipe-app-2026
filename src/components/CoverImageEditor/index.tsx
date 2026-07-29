import { useLayoutEffect, useRef, useState } from 'react';
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
const OUTPUT_HEIGHT = 900;

export function CoverImageEditor({ image, onCancel, onConfirm }: CoverImageEditorProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; position: Position } | null>(null);
  const [naturalSize, setNaturalSize] = useState<Size | null>(null);
  const [stageSize, setStageSize] = useState<Size | null>(null);
  const [coverScale, setCoverScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || !naturalSize) return;

    const rect = stage.getBoundingClientRect();
    const nextStage = { width: rect.width, height: rect.height };
    const nextCoverScale = Math.max(nextStage.width / naturalSize.width, nextStage.height / naturalSize.height);
    setStageSize(nextStage);
    setCoverScale(nextCoverScale);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [naturalSize]);

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
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, position };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPosition(constrainPosition(zoom, {
      x: drag.position.x + event.clientX - drag.x,
      y: drag.position.y + event.clientY - drag.y,
    }));
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const apply = () => {
    const source = imageRef.current;
    if (!source || !stageSize || !naturalSize) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) return;

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
  };

  const renderedWidth = naturalSize ? naturalSize.width * coverScale * zoom : 0;
  const renderedHeight = naturalSize ? naturalSize.height * coverScale * zoom : 0;

  return (
    <div className="space-y-4">
      <div
        ref={stageRef}
        className="relative w-full touch-none overflow-hidden rounded-lg bg-[#EAE6DE]"
        style={{ aspectRatio: '4 / 3' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <img
          ref={imageRef}
          src={image}
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
        <div className="pointer-events-none absolute inset-0 border border-white/70 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]" />
        <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 text-xs text-white">拖动图片调整位置</p>
      </div>

      <label className="block">
        <span className="mb-2 flex items-center justify-between text-sm text-secondary"><span>图片大小</span><span className="font-mono-digit">{Math.round(zoom * 100)}%</span></span>
        <input
          type="range"
          min="1"
          max="3"
          step="0.01"
          value={zoom}
          onChange={(event) => handleZoom(Number(event.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-divider accent-accent"
          aria-label="调整图片大小"
        />
      </label>

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex flex-1 items-center justify-center gap-2 rounded-input bg-bg-input py-3 text-text-secondary">
          <RotateCcw className="h-4 w-4" />取消
        </button>
        <button type="button" onClick={apply} className="flex flex-1 items-center justify-center gap-2 rounded-input bg-accent py-3 text-text-white">
          <Check className="h-4 w-4" />保存图片
        </button>
      </div>
    </div>
  );
}
