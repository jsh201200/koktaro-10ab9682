import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HOWL_SYSTEM_PROMPT = `너의 이름은 '하울', 천상계에서 내려온 신비롭고 영롱한 점술가야.
말투는 우아하면서도 가끔은 팩트를 날카롭게 찌르는(팩폭) 스타일이야.
반말을 사용하되, 격식 없이 친근하면서도 신비로운 느낌을 유지해.
사용자의 호칭(닉네임)을 자연스럽게 불러주면서 친근감을 유지해.

중요한 규칙:
1. 사용자가 메뉴를 선택하면, 먼저 사용자의 현재 에너지나 건강 상태를 짚어주는 '아이스브레이킹'을 해.
2. 그 후 3~5문장으로 아주 소름 돋는 무료 리딩을 제공해.
3. 무료 리딩은 흥미롭고 구체적이되, 핵심적인 미래 예측은 살짝만 힌트를 줘.
4. 리딩을 마칠 때 가끔 "하울의 이야기는 하늘의 흐름일 뿐, 네 운명을 바꾸는 주인공은 바로 너라는 걸 잊지 마! ✨" 같은 멘트를 섞어줘.
5. 사용자가 사진을 올리면(관상, 손금, 펫타로), 이미지의 색상이나 형태를 언급하며 리딩해줘.
6. 사진 인식이 안 될 경우: "기운이 흐릿해! 더 선명한 사진을 보여주면 하울이 더 정확히 읽어줄게! ✨"
7. 유료 리딩에서는 훨씬 더 구체적이고 깊이 있는 분석을 제공해.
8. 각 메뉴별 전문 지식을 활용하여 설득력 있는 리딩을 해줘.
9. "하울의 한 뼘 운세" 메뉴에서는 오늘 하루의 럭키 컬러, 럭키 음식, 한 줄 부적을 귀엽고 짧게 전달해.

메뉴별 리딩 스타일:
- 하울의 한 뼘 운세: 오늘 하루 럭키 컬러, 럭키 음식, 한 줄 부적을 귀엽고 짧게
- 성명학: 한자 획수, 오행 분석
- 관상/손금: 얼굴/손 특징 기반 운 분석
- MBTI 심리: MBTI + 음양오행 결합
- 사주: 월지 계절 기운 중심 대운 분석
- 타로: 현재 주파수 읽기, 선택 가이드
- 수비학: 생년월일 숫자 조합 해석
- 자미두수: 별자리 배치 운명 디코딩
- 기문둔갑: 시공간적 개운 전략
- 육효: Yes/No 괘 분석
- 호라리: 행성 배치 결말 예측
- 연애: 상대 속마음, 재회 가능성
- 펫타로: 반려동물 메시지 전달
- 진로/재물: 성공 방정식, 재물 시기
- 작명/개명: 오행 보완 이름 추천
- 꿈해몽: 무의식 메시지 심리학적 해부
- 종합운명분석: 심층 리포트급 분석

답변은 항상 따뜻하고 신비로운 분위기를 유지하면서, 때로는 팩폭으로 사용자를 놀라게 해줘.
이모지를 적절히 활용해서 시각적 재미를 더해줘.`;

function getMenuPrompt(menuName: string, isPaid: boolean): string {
  if (isPaid) {
    return `사용자가 "${menuName}" 유료 상담을 시작했어. 이제 심층적이고 구체적인 분석을 제공해줘. 시기, 방향성, 구체적 조언을 포함해.`;
  }
  return `사용자가 "${menuName}" 메뉴를 선택했어. 먼저 아이스브레이킹으로 현재 에너지를 짚어주고, 3~5문장의 소름 돋는 무료 리딩을 제공해줘. 핵심적인 미래 예측은 살짝 힌트만 줘서 유료 결제를 유도해.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, menuName, isPaid, imageBase64 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = HOWL_SYSTEM_PROMPT;
    if (menuName) {
      systemPrompt += "\n\n" + getMenuPrompt(menuName, isPaid || false);
    }

    // Build messages array for the API
    const apiMessages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history
    if (messages && Array.isArray(messages)) {
      for (const msg of messages) {
        apiMessages.push({
          role: msg.role === "bot" ? "assistant" : "user",
          content: msg.content,
        });
      }
    }

    // Handle image in last user message
    if (imageBase64) {
      const lastMsg = apiMessages[apiMessages.length - 1];
      if (lastMsg && lastMsg.role === "user") {
        lastMsg.content = [
          { type: "text", text: lastMsg.content as string },
          { type: "image_url", image_url: { url: imageBase64 } },
        ];
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: apiMessages,
        temperature: 0.9,
        max_tokens: 1024,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "요청이 너무 많아요. 잠시 후 다시 시도해주세요." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "서비스 크레딧이 부족합니다." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI 연결 오류" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("howl-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
