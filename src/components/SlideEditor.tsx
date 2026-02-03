import React, { useMemo, useRef, useState, useEffect } from "react";
import { Stage, Layer, Text, Rect, Image as KImage } from "react-konva";
import Konva from "konva";
import type { EditableSlide, SlideLayer, TextLayer, StickerLayer } from "../types";
import { STICKERS } from "./stickers";

const W = 1080;
const H = 1350;
const SAFE_TOP = 160;
const SAFE_BOTTOM = 1250;

function useHtmlImage(src?: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) { setImg(null); return; }
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.onload = () => setImg(i);
    i.src = src;
  }, [src]);
  return img;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function SlideEditor({
  slides,
  setSlides,
}: {
  slides: EditableSlide[];
  setSlides: React.Dispatch<React.SetStateAction<EditableSlide[]>>;
}) {
  const stageRef = useRef<Konva.Stage>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const slide = slides[activeIndex];
  const bgImg = useHtmlImage(slide?.background);

  const selectedLayer = useMemo(() => {
    if (!slide || !selectedId) return null;
    return slide.layers.find(l => l.id === selectedId) || null;
  }, [slide, selectedId]);

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
      x: 430,
      y: 900,
      width: 220,
      height: 220,
      draggable: true,
    };
    setSlides(prev => prev.map((s, idx) =>
      idx === activeIndex ? ({ ...s, layers: [...s.layers, newLayer] }) : s
    ));
    setSelectedId(newLayer.id);
  };

  const toggleLegibilityBand = () => {
    setSlides(prev => prev.map((s, idx) => {
      if (idx !== activeIndex) return s;
      return { ...s, legibilityBandOn: !s.legibilityBandOn };
    }));
  };

  // ---- 텍스트 정렬 (텍스트에만 적용) ----
  const getTextNodeWidthApprox = (t: TextLayer) => {
    // width가 있으면 그걸 기준으로, 없으면 대략 fontSize*글자수*0.6
    if (t.width) return t.width;
    return clamp(t.text.length * t.fontSize * 0.6, 200, 980);
  };

  const alignTextHoriz = (mode: "left" | "center" | "right") => {
    if (!selectedLayer || selectedLayer.kind !== "text") return;
    const t = selectedLayer as TextLayer;
    const w = getTextNodeWidthApprox(t);
    const x =
      mode === "left" ? 50 :
      mode === "center" ? Math.round((W - w) / 2) :
      Math.round(W - w - 50);
    updateLayer(t.id, { x, align: mode });
  };

  const alignTextVert = (mode: "top" | "middle" | "bottom") => {
    if (!selectedLayer || selectedLayer.kind !== "text") return;
    const y =
      mode === "top" ? SAFE_TOP :
      mode === "middle" ? Math.round(H / 2) :
      SAFE_BOTTOM;
    updateLayer(selectedLayer.id, { y });
  };

  // ---- Export ----
  const exportCurrent = () => {
    const uri = stageRef.current?.toDataURL({ pixelRatio: 2 });
    if (!uri) return;
    const a = document.createElement("a");
    a.href = uri;
    a.download = `carousel_slide_${slide.page_number}.png`;
    a.click();
  };

  const exportAll = async () => {
    const stage = stageRef.current;
    if (!stage) return;

    // activeIndex를 바꿔가며 렌더 → export (간단 구현)
    for (let i = 0; i < slides.length; i++) {
      setActiveIndex(i);
      setSelectedId(null);
      await new Promise(r => setTimeout(r, 120)); // 렌더 반영
      const uri = stage.toDataURL({ pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = uri;
      a.download = `carousel_slide_${slides[i].page_number}.png`;
      a.click();
      await new Promise(r => setTimeout(r, 150));
    }
  };

  // ---- 스티커 이미지 로딩 캐시 ----
  const stickerImages = useMemo(() => {
    const map = new Map<string, HTMLImageElement>();
    slide?.layers.forEach(l => {
      if (l.kind === "sticker") {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.src = l.dataUrl;
        map.set(l.id, img);
      }
    });
    return map;
  }, [slide]);

  if (!slide) return null;

  return (
    <div className="flex gap-6">
      {/* LEFT */}
      <div className="w-56 space-y-3">
        <div className="bg-white border rounded-2xl p-3">
          <div className="text-xs font-black text-slate-500 mb-2">Slides</div>
          <div className="space-y-2">
            {slides.map((s, i) => (
              <button
                key={s.page_number}
                onClick={() => { setActiveIndex(i); setSelectedId(null); }}
                className={`w-full px-3 py-2 rounded-xl text-left font-bold ${
                  i === activeIndex ? "bg-indigo-100 text-indigo-800" : "bg-slate-50 text-slate-700"
                }`}
              >
                Slide {s.page_number}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-slate-500">Legibility Band</div>
            <button
              onClick={toggleLegibilityBand}
              className={`px-3 py-1 rounded-full text-xs font-black ${
                slide.legibilityBandOn ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {slide.legibilityBandOn ? "ON" : "OFF"}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
            배경이 복잡할 때 글자 뒤에 반투명 띠를 깔아 가독성을 올립니다.
          </p>
        </div>

        <div className="bg-white border rounded-2xl p-3">
          <div className="text-xs font-black text-slate-500 mb-2">Stickers (3)</div>
          <div className="grid grid-cols-3 gap-2">
            {STICKERS.map(s => (
              <button key={s.id} onClick={() => addSticker(s.dataUrl)} className="bg-slate-50 border rounded-xl p-2">
                <img src={s.dataUrl} alt={s.name} />
              </button>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            <button onClick={exportCurrent} className="flex-1 bg-indigo-600 text-white rounded-xl py-2 font-black">
              Export (This)
            </button>
            <button onClick={exportAll} className="flex-1 bg-slate-900 text-white rounded-xl py-2 font-black">
              Export (All)
            </button>
          </div>
        </div>
      </div>

      {/* CANVAS */}
      <div className="bg-white border rounded-2xl p-4">
        <Stage
          width={W}
          height={H}
          ref={stageRef}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) {
              setSelectedId(null);
              return;
            }
          }}
        >
          <Layer>
            {/* background */}
            {!slide.background && (
              <Rect x={0} y={0} width={W} height={H} fill={slide.bgColor || "#0b1220"} />
            )}
            {bgImg && (
              <KImage image={bgImg} x={0} y={0} width={W} height={H} />
            )}

            {/* legibility band */}
            {slide.legibilityBandOn && (
              <Rect x={0} y={520} width={W} height={420} fill="rgba(0,0,0,0.35)" />
            )}

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
                    onClick={() => setSelectedId(l.id)}
                    onTap={() => setSelectedId(l.id)}
                    onDragEnd={(e) => updateLayer(l.id, { x: e.target.x(), y: e.target.y() })}
                  />
                );
              }
              if (l.kind === "sticker") {
                const img = stickerImages.get(l.id);
                return (
                  <KImage
                    key={l.id}
                    id={l.id}
                    image={img}
                    x={l.x}
                    y={l.y}
                    width={l.width}
                    height={l.height}
                    draggable
                    onClick={() => setSelectedId(l.id)}
                    onTap={() => setSelectedId(l.id)}
                    onDragEnd={(e) => updateLayer(l.id, { x: e.target.x(), y: e.target.y() })}
                  />
                );
              }
              if (l.kind === "rect") {
                // (현재는 사용 안 함. 옵션으로 남겨둠)
                return (
                  <Rect
                    key={l.id}
                    id={l.id}
                    x={l.x} y={l.y}
                    width={l.width} height={l.height}
                    fill={l.fill}
                    cornerRadius={l.cornerRadius}
                    draggable
                    onClick={() => setSelectedId(l.id)}
                    onDragEnd={(e) => updateLayer(l.id, { x: e.target.x(), y: e.target.y() })}
                  />
                );
              }
              return null;
            })}
          </Layer>
        </Stage>
      </div>

      {/* RIGHT: TEXT-ONLY PANEL */}
      <div className="w-72 space-y-3">
        <div className="bg-white border rounded-2xl p-4">
          <div className="text-xs font-black text-slate-500 mb-3">Selected</div>

          {!selectedLayer && (
            <p className="text-sm text-slate-500">캔버스에서 텍스트(또는 스티커)를 클릭하세요.</p>
          )}

          {selectedLayer && selectedLayer.kind !== "text" && (
            <p className="text-sm text-slate-500">
              선택된 항목은 텍스트가 아닙니다. (정렬/폰트 조정은 텍스트만 지원)
            </p>
          )}

          {selectedLayer && selectedLayer.kind === "text" && (
            <>
              {/* quick align */}
              <div className="text-[11px] font-black text-slate-500 mt-2 mb-2">Quick Align</div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => alignTextHoriz("left")} className="py-2 rounded-xl bg-slate-50 border font-bold text-sm">Left</button>
                <button onClick={() => alignTextHoriz("center")} className="py-2 rounded-xl bg-slate-50 border font-bold text-sm">Center</button>
                <button onClick={() => alignTextHoriz("right")} className="py-2 rounded-xl bg-slate-50 border font-bold text-sm">Right</button>

                <button onClick={() => alignTextVert("top")} className="py-2 rounded-xl bg-slate-50 border font-bold text-sm">Top</button>
                <button onClick={() => alignTextVert("middle")} className="py-2 rounded-xl bg-slate-50 border font-bold text-sm">Middle</button>
                <button onClick={() => alignTextVert("bottom")} className="py-2 rounded-xl bg-slate-50 border font-bold text-sm">Bottom</button>
              </div>

              {/* numeric controls */}
              <div className="mt-4 space-y-3">
                <Field label="X" value={Math.round(selectedLayer.x)} onChange={(v) => updateLayer(selectedLayer.id, { x: v })} />
                <Field label="Y" value={Math.round(selectedLayer.y)} onChange={(v) => updateLayer(selectedLayer.id, { y: v })} />
                <Field label="Font Size" value={selectedLayer.fontSize} onChange={(v) => updateLayer(selectedLayer.id, { fontSize: v })} />
                <Field label="Width" value={selectedLayer.width ?? 900} onChange={(v) => updateLayer(selectedLayer.id, { width: v })} />
                <Field label="Line Height" value={Math.round((selectedLayer.lineHeight ?? 1.25) * 100)} onChange={(v) => updateLayer(selectedLayer.id, { lineHeight: v / 100 })} />
              </div>
            </>
          )}
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <div className="text-xs font-black text-slate-500 mb-2">Tip</div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Visuals가 없을 때는 단색 배경으로 편집하고, Visuals를 생성하면 배경만 자동으로 채워집니다.
            텍스트 위치/크기는 그대로 유지됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs font-black text-slate-500 w-24">{label}</div>
      <input
        className="flex-1 bg-slate-50 border rounded-xl px-3 py-2 text-sm font-bold"
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
