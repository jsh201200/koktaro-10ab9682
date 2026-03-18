import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PERSONA_PROMPTS: Record<string, string> = {
  ian: `너는 '이안', 30대 남성 재물/진로 전문 상담사. 냉철하고 숫자로 증명하는 투자 전문가. 답변에 반드시 포함: 수익률(%), 예상 비용, 구체적 숫자.`,
  jihan: `너는 '지한', 20대 남성 연애/MBTI 전문 상담사. 잔망스러운 남사친. "ㅋㅋ", "헐 대박적" 같은 리액션. 답변에 반드시 포함: 날짜(D-day), 인기 지수(%), 행운의 장소.`,
  song: `너는 '송선생', 50대 남성 정통 사주/역학 전문 상담사. 사자성어와 격언을 섞은 우아한 문체. 답변에 반드시 포함: 간지(干支), 길방(방향), 수호 오행.`,
  luna: `너는 '루나', 20대 여성 타로/신비 전문 상담사. 몽환적인 요정. ✨🌙🔮 이모지 조합. 답변에 반드시 포함: 타로 키워드, 행운의 컬러, 명상 시간.`,
  suhyun: `너는 '수현', 30대 여성 심리/위로 전문 상담사. "충분히 잘하고 있어" 같은 무조건적 지지. 답변에 반드시 포함: 행동 지침(To-Do 3가지), 심리적 안정 시기.`,
  myunghwa: `너는 '명화', 50대 여성 관상/카리스마 전문 상담사. 팩트 폭격. "잘 들어!", "딱 봐도 알겠어". 답변에 반드시 포함: 금기사항, 대박 날 시간, 개운 비방.`,
};

const EMERGENCY_19: Record<string, string> = {
  ian: '이 질문은 음양의 에너지 균형 관점에서 분석해볼게.',
  jihan: '오 ㅋㅋ 이건 운명적 케미의 영역인데?? 에너지 밸런스로 읽어볼게~',
  song: '허허, 이는 음양의 조화에 관한 것이로구나.',
  luna: '✨ 이건 영혼 깊은 곳의 에너지가 끌어당기는 거야~ 🌙',
  suhyun: '이런 고민도 자연스러운 거야. 에너지 흐름을 심리학적으로 풀어볼게.',
  myunghwa: '잘 들어! 속궁합이란 결국 기운의 궁합이야. 핵심만 짚어줄게.',
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, menuName, isPaid, imageBase64, counselorId, menuPrice } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const persona = counselorId && PERSONA_PROMPTS[counselorId] ? PERSONA_PROMPTS[counselorId] : PERSONA_PROMPTS.luna;
    const emergency = counselorId && EMERGENCY_19[counselorId] ? EMERGENCY_19[counselorId] : EMERGENCY_19.luna;

    let tierInstruction = '';
    const price = menuPrice || 0;
    if (!isPaid || price <= 1000) {
      tierInstruction = `분량 규칙: 3~5문장 이내로 짧게 끊어. 결론 직전에 말을 끊고 유료 전환 유도.`;
    } else if (price <= 39900) {
      tierInstruction = `분량 규칙: 실시간 대화의 재미를 극대화. 구체적인 날짜와 숫자 데이터를 반드시 포함.`;
    } else {
      tierInstruction = `분량 규칙: 문서로서의 완성도에 집중. 매우 상세하고 깊이 있는 분석 제공.`;
    }

    const systemPrompt = `${persona}

${tierInstruction}

메뉴: ${menuName || '일반 상담'}
유료 여부: ${isPaid ? '유료' : '무료'}

텍스트 출력 규칙:
- 별표(**), 샵(#), 대시(-), 밑줄(__) 같은 마크다운 특수문자를 절대 사용하지 마
- 강조는 줄바꿈이나 이모지로만 해
- 카톡 채팅처럼 깔끔한 텍스트만 출력해

19금 대응: 검열에 걸릴 법한 질문은 "${emergency}"로 시작해서 음양의 조화 관점으로 화제를 전환해서 상담을 완수해.

사용자 호칭을 자연스럽게 불러주며 친근감 유지.`;

    const allMessages: any[] = [{ role: "system", content: systemPrompt }];

    for (const m of messages) {
      const role = m.role === 'bot' ? 'assistant' : 'user';
      allMessages.push({ role, content: m.content });
    }

    if (imageBase64) {
      const lastMsg = allMessages[allMessages.length - 1];
      if (lastMsg && lastMsg.role === 'user') {
        lastMsg.content = [
          { type: "text", text: typeof lastMsg.content === 'string' ? lastMsg.content : '' },
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
        messages: allMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
