import React, { useMemo, useRef, useState } from "react";
import { Stage, Layer, Text, Rect, Image as KImage, Transformer } from "react-konva";
import Konva from "konva";
import { EditableSlide, SlideLayer, StickerLayer } from "../types";
import { STICKERS } from "./stickers";

function useHtmlImage(src?: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  React.useEffect(() => {
    if (!src) { setImg(null); return; }
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.onload = () => setImg(i);
    i.src = src;
  }, [src]);
  return img;
}

export default function SlideEditor({
  slides,
  activeIndex,
  setActiveIndex,
  setSlides,
}: {
  slides: EditableSlide[];
  activeIndex: number;
  setActiveIndex: (n: number) => void;
  setSlides: React.Dispatch<React.SetStateAction<EditableSlide[]>>;
}) {
  const W = 1080, H = 1350;
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const slide = slides[activeIndex];
  const bgImg = useHtmlImage(slide?.background);

  const updateLayer = (layerId: string, patch: Partial<SlideLayer>) => {
    setSlides(prev => prev.map((s, idx) => {
      if (idx !== activeIndex) return s;
      return {
        ...s,
        layers: s.layers.map(l => l.id === layerId ? ({ ...l, ...patch } as any) : l)
      };
    }));
  };

  const addSticker = (dataUrl: string) => {
    const newLayer: StickerLayer = {
      id: `stk-${Date.now()}`,
      kind: "sticker",
      dataUrl,
      x: 200,
      y: 500,
      width: 220,
      height: 220,
      draggable: true,
    };
    setSlides(prev => prev.map((s, idx) => idx === activeIndex ? ({ ...s, layers: [...s.layers, newLayer] }) : s));
  };

  const onSelect = (id: string) => {
    setSelectedId(id);
    setTimeout(() => {
      const stage = stageRef.current;
      const tr = trRef.current;
      if (!stage || !tr) return;
      const node = stage.findOne(`#${id}`);
      if (node) {
        tr.nodes([node as any]);
        tr.getLayer()?.batchDraw();
      }
    }, 0);
  };

  const exportCurrent = () => {
    const uri = stageRef.current?.toDataURL({ pixelRatio: 2 });
    if (!uri) return;
    const a = document.createElement("a");
    a.href = uri;
    a.download = `carousel_slide_${slide.page_number}.png`;
    a.click();
  };

  return (
    <div className="flex gap-6">
      {/* 좌측: 썸네일/페이지 선택 */}
      <div className="w-48 space-y-2">
        {slides.map((s, i) => (
          <button
            key={s.page_number}
            onClick={() => { setActiveIndex(i); setSelectedId(null); }}
            className={`w-full p-2 rounded-lg text-left ${i === activeIndex ? "bg-indigo-100" : "bg-slate-50"}`}
          >
            Slide {s.page_number}
          </button>
        ))}

        <div className="pt-4 space-y-2">
          <div className="text-xs font-bold text-slate-500">Stickers</div>
          <div className="grid grid-cols-3 gap-2">
            {STICKERS.map(s => (
              <button key={s.id} onClick={() => addSticker(s.dataUrl)} className="bg-white border rounded-lg p-1">
                <img src={s.dataUrl} alt={s.name} />
              </button>
            ))}
          </div>

          <button onClick={exportCurrent} className="w-full mt-4 bg-indigo-600 text-white rounded-xl py-2 font-bold">
            Export PNG (This)
          </button>
        </div>
      </div>

      {/* 중앙: 캔버스 */}
      <div className="bg-white rounded-2xl p-4 border">
        <Stage
          width={W}
          height={H}
          ref={stageRef}
          onMouseDown={(e) => {
            // 빈 곳 클릭하면 선택 해제
            if (e.target === e.target.getStage()) {
              setSelectedId(null);
              trRef.current?.nodes([]);
              return;
            }
          }}
        >
          <Layer>
            {/* background (없으면 단색) */}
            {!slide.background && <Rect x={0} y={0} width={W} height={H} fill={slide.bgColor || "#0b1220"} />}
            {bgImg && <KImage image={bgImg} x={0} y={0} width={W} height={H} />}

            {/* layers */}
            {slide.layers.map((l) => {
              if (l.kind === "text") {
                return (
                  <Text
                    key={l.id}
                    id={l.id}
                    text={l.text}
                    x={l.x}
                    y={l.y}
                    width={l.width}
                    align={l.align}
                    fontSize={l.fontSize}
                    fontStyle={l.fontStyle}
                    fill={l.fill}
                    lineHeight={l.lineHeight}
                    draggable
                    onClick={() => onSelect(l.id)}
                    onTap={() => onSelect(l.id)}
                    onDragEnd={(e) => updateLayer(l.id, { x: e.target.x(), y: e.target.y() })}
                  />
                );
              }

              if (l.kind === "rect") {
                return (
                  <Rect
                    key={l.id}
                    id={l.id}
                    x={l.x} y={l.y}
                    width={l.width} height={l.height}
                    fill={l.fill}
                    cornerRadius={l.cornerRadius}
                    draggable
                    onClick={() => onSelect(l.id)}
                    onDragEnd={(e) => updateLayer(l.id, { x: e.target.x(), y: e.target.y() })}
                  />
                );
              }

              if (l.kind === "sticker") {
                const stickerImg = useHtmlImage(l.dataUrl); // 간단 구현(최적화는 다음 단계)
                return (
                  <KImage
                    key={l.id}
                    id={l.id}
                    image={stickerImg || undefined}
                    x={l.x} y={l.y}
                    width={l.width} height={l.height}
                    draggable
                    onClick={() => onSelect(l.id)}
                    onDragEnd={(e) => updateLayer(l.id, { x: e.target.x(), y: e.target.y() })}
                  />
                );
              }

              return null;
            })}

            <Transformer ref={trRef} rotateEnabled={true} />
          </Layer>
        </Stage>
      </div>

      {/* 우측: 속성 패널(폰트/크기/색/좌표) — 다음 단계에서 붙이면 됨 */}
    </div>
  );
}
