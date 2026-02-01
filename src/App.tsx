
import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Download,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  CheckCircle2,
  FileJson,
  ArrowRight,
  Save,
  Check,
  Languages,
  Instagram
} from 'lucide-react';
import { BuildUIParams, EngineOutput, RecommendMode, CarouselPage } from './types';
import { runPipeline } from './services/geminiService';

const GAS_URL = "https://script.google.com/macros/s/AKfycbw8o4NXGeUpbhcEiXHGcHn3aZyeO_-BzZVAs3QqBBYz4gW-7wP8fMdBNSXwh9ZQKzLikg/exec";

export default function App() {
  const [params, setParams] = useState<BuildUIParams>({
    step: "text_plan",
    mode: "generate",
    query_ko: "그거 진짜 대박이다",
    query_en: "That's mind-blowing",
    pages_count: 5,
    examples_count: 3,
    watermark_handle: "@samcho0127",
    difficulty: "intermediate",
    tone: "friendly",
    style_request: "hybrid",
    hybrid_choice: "undecided",
    selected_style: "A_photo",
    translation_mode: "double",
    region_timezone: "Asia/Seoul",
    recommend_time: "06:30",
    today_date: new Date().toISOString().split('T')[0],
    recommend_mode: "daily_candidates",
    plan_json: null
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0); 
  const [planOutput, setPlanOutput] = useState<EngineOutput | null>(null);
  const [imagesOutput, setImagesOutput] = useState<EngineOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const executeStep = async (step: "text_plan" | "images") => {
    setLoading(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const result = await runPipeline({ 
        ...params, 
        step, 
        plan_json: step === "text_plan" ? null : planOutput 
      });
      
      if (result.status === "error") {
        throw new Error(result.message || result.error_code || "Pipeline error");
      }

      if (step === "text_plan") {
        setPlanOutput(result);
        setImagesOutput(null);
        setCurrentStep(1);
      } else if (step === "images") {
        setImagesOutput(result);
        if (currentStep < 2) setCurrentStep(2);
      }

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToSheets = async () => {
    const planJson = planOutput?.plan_json;
    if (!planJson) {
      setError("No data to save.");
      return;
    }

    setSaving(true);
    try {
      const carouselId = `car_${Date.now()}`;
      const payload = {
        carousel_id: carouselId,
        created_at: new Date().toISOString(),
        query_ko: params.query_ko,
        query_en: params.query_en,
        plan_json: planJson,
      };

      await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(`Save error: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  const generateCompositedImage = async (page: CarouselPage, base64Image: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64Image);

      canvas.width = 1080;
      canvas.height = 1350;

      const img = new Image();
      img.onload = () => {
        const imgRatio = img.width / img.height;
        const canvasRatio = canvas.width / canvas.height;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgRatio > canvasRatio) {
          drawHeight = canvas.height;
          drawWidth = canvas.height * imgRatio;
          offsetX = (canvas.width - drawWidth) / 2;
          offsetY = 0;
        } else {
          drawWidth = canvas.width;
          drawHeight = canvas.width / imgRatio;
          offsetX = 0;
          offsetY = (canvas.height - drawHeight) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, 'rgba(0,0,0,0.6)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
        grad.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        const isSlide1 = page.page_number === 1;

        if (isSlide1) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 110px sans-serif';
          wrapText(ctx, `"${page.content}"`, canvas.width / 2, canvas.height / 2 - 40, 900, 130);

          ctx.shadowBlur = 0;
          ctx.font = 'bold 36px sans-serif';
          const labelWidth = ctx.measureText(page.label.toUpperCase()).width + 60;
          ctx.fillStyle = 'rgba(79, 70, 229, 0.9)';
          roundRect(ctx, canvas.width / 2 - labelWidth / 2, canvas.height / 2 + 100, labelWidth, 60, 30, true);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(page.label.toUpperCase(), canvas.width / 2, canvas.height / 2 + 130);
        } else {
          ctx.shadowBlur = 0;
          ctx.font = 'bold 28px sans-serif';
          const labelText = page.label.toUpperCase();
          const tw = ctx.measureText(labelText).width + 30;
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          roundRect(ctx, canvas.width / 2 - tw / 2, canvas.height / 2 - 250, tw, 45, 10, true);
          ctx.fillStyle = '#818cf8';
          ctx.fillText(labelText, canvas.width / 2, canvas.height / 2 - 227);

          ctx.shadowBlur = 10;
          ctx.fillStyle = '#ffffff';
          
          const standardFontSize = 75;

          if (page.page_number === 2) {
            // Split content into English Expression and Korean Explanation
            const lines = page.content.split('\n');
            const englishPart = lines[0];
            const koreanPart = lines.slice(1).join('\n');

            // Draw English (Stay as is)
            ctx.font = `bold ${standardFontSize}px sans-serif`;
            ctx.fillText(englishPart, canvas.width / 2, canvas.height / 2 - 40);

            // Draw Korean (Reduced by 50%)
            if (koreanPart) {
              ctx.font = `bold ${Math.floor(standardFontSize * 0.5)}px sans-serif`;
              ctx.fillText(koreanPart, canvas.width / 2, canvas.height / 2 + 60);
            }
          } else {
            let fontSize = standardFontSize;
            let contentToRender = page.content;

            if (page.page_number === 5) {
              fontSize = Math.floor(standardFontSize * 0.8); // 80% Decrease for Summary
              contentToRender = contentToRender.replace(/^(Summary|요약|Summary:|요약:)\s*/i, '');
            }

            ctx.font = `bold ${fontSize}px sans-serif`;
            wrapText(ctx, contentToRender, canvas.width / 2, canvas.height / 2, 850, fontSize * 1.4);
          }
        }

        ctx.shadowBlur = 0;
        ctx.textAlign = 'right';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('@samcho0127', canvas.width - 50, 60);

        ctx.textAlign = 'left';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText(page.page_number.toString().padStart(2, '0'), 50, canvas.height - 60);

        resolve(canvas.toDataURL('image/png'));
      };
      img.src = base64Image;
    });
  };

  function wrapText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const paragraphs = text.split('\n');
    let allLines: string[] = [];

    paragraphs.forEach(p => {
      const words = p.split(' ');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          allLines.push(line);
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      allLines.push(line);
    });
    
    const totalHeight = allLines.length * lineHeight;
    let startY = y - (totalHeight / 2) + (lineHeight / 2);
    
    for (let k = 0; k < allLines.length; k++) {
      ctx.fillText(allLines[k].trim(), x, startY);
      startY += lineHeight;
    }
  }

  function roundRect(ctx: any, x: number, y: number, width: number, height: number, radius: number, fill: boolean) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
  }

  const downloadComposited = async (page: CarouselPage) => {
    const raw = getSlideImage(page.page_number);
    if (!raw) return;
    const finalData = await generateCompositedImage(page, raw);
    const link = document.createElement('a');
    link.href = finalData;
    link.download = `carousel_slide_${page.page_number}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllImages = async () => {
    if (!pages) return;
    for (const page of pages) {
      await downloadComposited(page);
    }
  };

  const updateParam = (key: keyof BuildUIParams, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const currentPlan = planOutput?.plan_json;
  const pages = currentPlan?.content?.pages;
  const caption = currentPlan?.content?.caption;

  const getSlideImage = (pageNum: number) => {
    return imagesOutput?.images?.find(img => img.page_index === pageNum)?.image_asset;
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900 relative">
      {loading && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl flex flex-col items-center gap-4 border border-slate-100 scale-100 text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <Sparkles className="absolute inset-0 m-auto text-indigo-600 animate-pulse" size={24} />
            </div>
            <div>
              <p className="text-lg font-black text-slate-800 tracking-tight">AI Engine Running...</p>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Designing your carousel</p>
            </div>
          </div>
        </div>
      )}

      <aside className="w-full lg:w-96 bg-white border-r border-slate-200 p-6 space-y-8 flex-shrink-0 lg:h-screen lg:sticky lg:top-0 overflow-y-auto shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-xl shadow-indigo-100">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Carousel AI</h1>
            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">2-Step Pipeline v1.7</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 p-1 rounded-xl flex border border-slate-100 shadow-inner">
            {["generate", "recommend"].map((m) => (
              <button
                key={m}
                onClick={() => updateParam("mode", m as "generate" | "recommend")}
                className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all ${params.mode === m ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {params.mode === 'generate' ? (
              <div className="space-y-3">
                <input type="text" value={params.query_ko} onChange={e => updateParam("query_ko", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="예: 분위기 파악해" />
                <input type="text" value={params.query_en} onChange={e => updateParam("query_en", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Read the room" />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Recommendation Mode</label>
                <select value={params.recommend_mode} onChange={e => updateParam("recommend_mode", e.target.value as RecommendMode)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm">
                  <option value="daily_candidates">Daily Candidates (3x)</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <select value={params.difficulty} onChange={e => updateParam("difficulty", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm">
                <option value="basic">Basic</option>
                <option value="intermediate">Intermediate</option>
              </select>
              <select value={params.tone} onChange={e => updateParam("tone", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm">
                <option value="friendly">Friendly</option>
                <option value="humorous">Humorous</option>
              </select>
            </div>

            <select value={params.selected_style} onChange={e => updateParam("selected_style", e.target.value)} className="w-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-xl px-4 py-3 text-sm">
              <option value="A_photo">A_Photo (Realistic)</option>
              <option value="B_comic">B_Comic (Illustration)</option>
            </select>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-slate-100">
          <button onClick={() => executeStep("text_plan")} disabled={loading} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all group ${currentStep >= 1 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <FileJson size={18} />
              </div>
              <p className="text-sm font-bold">1. Text Plan</p>
            </div>
            {currentStep >= 1 && <CheckCircle2 size={18} className="text-indigo-600" />}
          </button>

          <button onClick={() => executeStep("images")} disabled={loading || !planOutput} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all group ${currentStep >= 2 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : planOutput ? 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300' : 'bg-slate-50 border-slate-100 text-slate-300 opacity-50 cursor-not-allowed'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${currentStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <ImageIcon size={18} />
              </div>
              <p className="text-sm font-bold">2. Visuals</p>
            </div>
            {currentStep >= 2 && <CheckCircle2 size={18} className="text-emerald-600" />}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs flex gap-2 animate-in slide-in-from-top-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div ref={resultRef} className="max-w-6xl mx-auto p-4 lg:p-10 space-y-12">
          {!planOutput ? (
            <div className="flex flex-col items-center justify-center py-32 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="relative w-40 h-40 bg-white rounded-[56px] shadow-2xl flex items-center justify-center text-indigo-600 border border-slate-50 rotate-3 hover:rotate-0 transition-transform duration-500">
                <Sparkles size={80} strokeWidth={1.5} />
              </div>
              <h2 className="text-5xl font-black text-slate-800 tracking-tighter leading-tight">Instant <br/><span className="text-indigo-600">Carousel.</span></h2>
              <p className="text-slate-400 text-lg leading-relaxed font-medium">@samcho0127 전용 고품질 캐러셀 생성기</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-4 rounded-[32px] shadow-sm border border-slate-100 gap-4 sticky top-0 z-30 backdrop-blur-md bg-white/80">
                <div className="flex items-center gap-3 px-6">
                   <Languages className="text-indigo-600" size={24} />
                   <h2 className="font-black text-slate-800 tracking-tight">Slide View</h2>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={downloadAllImages} disabled={!imagesOutput} title="Download All" className="flex-1 sm:flex-none p-3.5 bg-slate-50 text-slate-500 rounded-2xl hover:bg-indigo-50 transition-colors shadow-sm disabled:opacity-30">
                    <Download size={22} />
                  </button>
                  <button onClick={handleSaveToSheets} disabled={saving} className={`flex-1 sm:flex-none px-8 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-xl transition-all ${saveSuccess ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white disabled:opacity-50'}`}>
                    {saving ? <Loader2 className="animate-spin" size={18} /> : saveSuccess ? <Check size={18} /> : <Save size={18} />}
                    {saveSuccess ? 'Saved' : 'Export'}
                  </button>
                </div>
              </div>

              {params.mode === 'recommend' && currentPlan?.recommendation?.daily_candidates && (
                <section className="bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-[56px] p-12 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group animate-in fade-in slide-in-from-top-4 duration-500">
                  <h2 className="text-3xl font-black mb-10 flex items-center gap-4"><Sparkles className="text-yellow-400" /> Daily Candidates</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                    {currentPlan.recommendation.daily_candidates.map((candidate, i) => (
                      <div key={i} className="bg-white/10 backdrop-blur-md p-8 rounded-[36px] border border-white/10 hover:bg-white/15 transition-all shadow-xl group/card">
                        <div className="text-yellow-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Idea {i+1}</div>
                        <div className="space-y-4">
                           <div className="space-y-1">
                              <p className="text-[10px] font-black text-indigo-300 uppercase">Korean</p>
                              <p className="text-xl font-black leading-tight">{candidate.ko}</p>
                           </div>
                           <div className="space-y-1 pt-4 border-t border-white/10">
                              <p className="text-[10px] font-black text-indigo-300 uppercase">English</p>
                              <p className="text-base font-bold opacity-80">{candidate.en}</p>
                           </div>
                        </div>
                        <button 
                          onClick={() => {
                            updateParam("query_ko", candidate.ko);
                            updateParam("query_en", candidate.en);
                            updateParam("mode", "generate");
                          }}
                          className="mt-8 w-full py-3 bg-white/10 hover:bg-white text-white hover:text-indigo-900 rounded-2xl text-xs font-black transition-all"
                        >
                          Use this idea
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {pages && (
                <section className="space-y-8 animate-in fade-in duration-700">
                  <div className="flex gap-8 overflow-x-auto pb-12 pt-2 px-4 scrollbar-hide snap-x">
                    {pages.map((page, idx) => {
                      const img = getSlideImage(page.page_number);
                      const isSlide1 = page.page_number === 1;
                      const isSlide2 = page.page_number === 2;
                      const isSlide5 = page.page_number === 5;
                      
                      let contentToPreview = page.content;
                      if (isSlide5) {
                        contentToPreview = contentToPreview.replace(/^(Summary|요약|Summary:|요약:)\s*/i, '');
                      }

                      return (
                        <div key={idx} className="min-w-[400px] w-[400px] aspect-[4/5] bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col snap-start relative group transition-all">
                          <div className="absolute inset-0 z-0">
                            {img ? (
                              <img src={img} className="w-full h-full object-cover" alt={page.content} />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-800">
                                <ImageIcon size={56} className="opacity-10 mb-4" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Ready for Visuals</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30"></div>
                          </div>

                          <div className="relative z-10 h-full p-10 flex flex-col justify-center items-center text-center">
                            {isSlide1 ? (
                              <>
                                <h3 className="text-[42px] font-black text-white leading-tight mb-6 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] px-4">
                                  "{page.content}"
                                </h3>
                                <div className="px-6 py-2 bg-indigo-600/90 backdrop-blur-sm rounded-full">
                                  <span className="text-[12px] font-black text-white tracking-widest uppercase">
                                    {page.label}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <>
                                <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6 bg-black/40 px-3 py-1 rounded backdrop-blur-sm">
                                  {page.label}
                                </span>
                                {isSlide2 ? (
                                  <div className="space-y-4">
                                    <p className="font-black text-white text-[32px] leading-[1.4] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] max-w-[340px] whitespace-pre-wrap">
                                      {page.content.split('\n')[0]}
                                    </p>
                                    <p className="font-bold text-white text-[16px] leading-[1.4] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] max-w-[340px] whitespace-pre-wrap opacity-90">
                                      {page.content.split('\n').slice(1).join('\n')}
                                    </p>
                                  </div>
                                ) : (
                                  <p className={`font-black text-white leading-[1.4] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] max-w-[340px] whitespace-pre-wrap 
                                    ${isSlide5 ? 'text-[25px]' : 'text-[32px]'}`}>
                                    {contentToPreview}
                                  </p>
                                )}
                              </>
                            )}

                            <div className="absolute top-10 right-10 text-[10px] font-black text-white/50 tracking-widest">@samcho0127</div>
                            <div className="absolute bottom-10 left-10 text-[12px] font-black text-white/40 tracking-[0.4em]">
                              {page.page_number.toString().padStart(2, '0')}
                            </div>

                            {img && (
                              <button 
                                onClick={() => downloadComposited(page)}
                                className="absolute bottom-10 right-10 p-3 bg-white/10 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Download size={20} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              <div className="max-w-2xl pb-20">
                {caption && (
                  <div className="bg-white rounded-[56px] shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl transition-shadow">
                    <div className="p-10 border-b border-slate-50 flex items-center gap-4">
                      <div className="bg-pink-100 p-3 rounded-2xl text-pink-600"><Instagram size={24} /></div>
                      <h3 className="font-black text-slate-800 text-xl">Insta Caption</h3>
                    </div>
                    <div className="p-10 bg-slate-50/20">
                       <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-[1.8] font-bold bg-white p-10 rounded-[40px] border border-slate-100 shadow-inner">{caption}</pre>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

