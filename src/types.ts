
export type AppMode = "generate" | "recommend";
export type RecommendMode = "daily_candidates" | "weekly_plan_sun";
export type Difficulty = "basic" | "intermediate" | "advanced";
export type Tone = "friendly" | "dry" | "humorous" | "emotional";
export type StyleRequest = "photo" | "illustration" | "hybrid";
export type HybridChoice = "A_photo" | "B_comic" | "undecided";
export type PipelineStep = "text_plan" | "images";

export interface BuildUIParams {
  step: PipelineStep;
  mode: AppMode;
  query_ko: string;
  query_en: string;
  pages_count: 4 | 5 | 6;
  examples_count: 2 | 3 | 4;
  watermark_handle: string;
  difficulty: Difficulty;
  tone: Tone;
  style_request: StyleRequest;
  hybrid_choice: HybridChoice;
  selected_style?: "A_photo" | "B_comic";
  translation_mode: "single" | "double";
  region_timezone: string;
  recommend_time: string;
  today_date: string;
  recommend_mode: RecommendMode;
  plan_json?: EngineOutput | null;
}

export interface CarouselPage {
  page_number: number;
  label: string; // e.g., "Today's Expression", "Meaning", "Example", "Summary"
  content: string; // The main text value
  image_prompt: string;
  watermark: string;
  image_prompt_comic?: string;
}

export interface ContentVersion {
  title: string;
  pages: CarouselPage[];
  caption: string;
}

export interface Candidate {
  ko: string;
  en: string;
}

export interface EngineOutput {
  status: "ok" | "error";
  step: PipelineStep;
  plan_json?: {
    meta: any;
    inputs_echo: any;
    recommendation?: {
      daily_candidates: Candidate[];
    };
    content?: ContentVersion;
  };
  images?: Array<{
    page_index: number;
    image_asset: string;
  }>;
  error_code?: string;
  message?: string;
}
export type LayerBase = {
  id: string;
  x: number;
  y: number;
  rotation?: number;
  opacity?: number;
  draggable?: boolean;
};

export type TextLayer = LayerBase & {
  kind: "text";
  text: string;
  fontSize: number;
  fontStyle?: string; // "bold" 등
  fill: string;       // "#ffffff"
  width?: number;     // 줄바꿈 폭
  align?: "left" | "center" | "right";
  lineHeight?: number;
};

export type RectLayer = LayerBase & {
  kind: "rect";
  width: number;
  height: number;
  fill: string;
  cornerRadius?: number;
  stroke?: string;
  strokeWidth?: number;
};

export type CircleLayer = LayerBase & {
  kind: "circle";
  radius: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
};

export type IconLayer = LayerBase & {
  kind: "icon";
  // lucide-react 아이콘 이름(간단히 string)
  iconName: string;   // "Sparkles" 같은 값
  size: number;
  color: string;
};

export type StickerLayer = LayerBase & {
  kind: "sticker";
  // 스티커 이미지를 dataURL로 저장 (업로드하면 dataURL 생성)
  dataUrl: string;
  width: number;
  height: number;
};

export type SlideLayer = TextLayer | RectLayer | CircleLayer | IconLayer | StickerLayer;

export type EditableSlide = {
  page_number: number;
  background?: string; // dataURL(visuals 결과)
  layers: SlideLayer[];
};





