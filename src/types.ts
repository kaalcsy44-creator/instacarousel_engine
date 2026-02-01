
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
