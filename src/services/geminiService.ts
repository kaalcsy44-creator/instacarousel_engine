import { GoogleGenAI, Type } from "@google/genai";
import { BuildUIParams, EngineOutput } from "../types";

const PIPELINE_SYSTEM_PROMPT = `
[GOOGLE AI STUDIO (BUILD) — 2-STEP PIPELINE CONTROLLER]
너는 “2단계 파이프라인 컨트롤러”다. 오직 JSON만 반환하며 설명 문장은 절대 금지한다.

STEP 1) Generate Text Plan (step == "text_plan")
- 이미지 생성 호출 금지.
- mode="recommend"이면 'daily_candidates' 3가지를 생성하며, 각각 한국어(ko)와 영어(en) 필드를 포함하라.
- mode="generate"이면 캐러셀 설계도(content)를 생성한다.
- 모든 슬라이드의 watermark는 반드시 "@samcho0127"로 설정한다.

슬라이드 구성 규칙 (총 5장 엄격히 준수):
1. Slide 1 (Intro): content는 한국어 핵심 표현(예: "분위기 파악해"), label은 "영어로 어떻게 표현할까요?".
2. Slide 2 (Expression & Meaning): 영어 핵심 표현(예: "Read the room")과 그 의미/뉘앙스 설명을 포함. label은 "Today's Expression & Meaning".
3. Slide 3 (Example 01): 첫 번째 실생활 예시 문장과 해석을 포함. 하나의 예시만 넣을 것. label은 "Example 01".
4. Slide 4 (Example 02): 두 번째 실생활 예시 문장과 해석을 포함. 하나의 예시만 넣을 것. label은 "Example 02".
5. Slide 5 (Summary): 전체 요약 및 복습. content에서 "Summary:", "요약:" 같은 단어를 절대 포함하지 마라. label은 "Summary".

- 각 슬라이드의 content는 핵심 텍스트를 담으며, label은 가이드 역할을 한다.
- 하이브리드 요청 시 사진풍/만화풍 프롬프트 모두 생성.
`;

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;

export const runPipeline = async (params: BuildUIParams): Promise<EngineOutput> => {
  if (!apiKey) {
    return {
      status: "error",
      step: params.step,
      error_code: "api_key_missing",
      message: "VITE_GEMINI_API_KEY is missing. Set it in Vercel Environment Variables and redeploy."
    } as EngineOutput;
  }

  const ai = new GoogleGenAI({ apiKey });

  if (params.step === "text_plan") {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `
System: ${PIPELINE_SYSTEM_PROMPT}
Current Step: text_plan
User Input: ${JSON.stringify(params)}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            step: { type: Type.STRING },
            plan_json: {
              type: Type.OBJECT,
              properties: {
                meta: { type: Type.OBJECT, properties: { version: { type: Type.STRING } } },
                recommendation: {
                  type: Type.OBJECT,
                  properties: {
                    daily_candidates: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          ko: { type: Type.STRING },
                          en: { type: Type.STRING }
                        },
                        required: ["ko", "en"]
                      }
                    }
                  }
                },
                content: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    caption: { type: Type.STRING },
                    pages: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          page_number: { type: Type.INTEGER },
                          label: { type: Type.STRING },
                          content: { type: Type.STRING },
                          image_prompt: { type: Type.STRING },
                          image_prompt_comic: { type: Type.STRING },
                          watermark: { type: Type.STRING }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text);
  }

  if (params.step === "images") {
    if (!params.plan_json?.plan_json) {
      return {
        status: "error",
        step: "images",
        error_code: "plan_json_missing",
        message: "Run Step 1 first."
      } as EngineOutput;
    }

    const pages = params.plan_json.plan_json.content?.pages || [];
    const generatedImages: any[] = [];
    const useComic = params.selected_style === "B_comic";

    for (const page of pages) {
      const rawPrompt = useComic ? (page.image_prompt_comic || page.image_prompt) : page.image_prompt;
      const finalPrompt = useComic
        ? `Clean modern webtoon/comic illustration, vibrant colors, 4:5 vertical, no text in image, aesthetic: ${rawPrompt}`
        : `Professional photography, cinematic lighting, 4:5 vertical, no text in image, aesthetic: ${rawPrompt}`;

      try {
        const imgResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: [{ parts: [{ text: finalPrompt }] }],
          config: { imageConfig: { aspectRatio: "3:4" } }
        });

        const part = imgResponse.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (part?.inlineData) {
          generatedImages.push({
            page_index: page.page_number,
            image_asset: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          });
        }
      } catch (err) {
        console.error("Image Gen Failed", err);
      }
    }

    return { status: "ok", step: "images", images: generatedImages } as EngineOutput;
  }

  return { status: "error", step: params.step, message: "Unknown step." } as EngineOutput;
};
