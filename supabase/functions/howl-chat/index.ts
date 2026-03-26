import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * 👤 상담사별 페르소나 지침 (프론트엔드 ID와 100% 일치화)
 * 'song'을 'songsengsang'으로 변경하여 데이터 유실을 방지했습니다.
 */
const PERSONA_PROMPTS: Record<string, string> = {
  ian: `당신은 '이안'입니다. 30대 남성, 투자 공학을 접목한 '데이터 역술 마스터'입니다. 냉철하고 이성적이며 결과를 수익률(%), 리스크 관리, 구체적 숫자로 증명하세요.`,
  jihan: `당신은 '지한'입니다. 20대 남성, 트렌디한 '잔망 남사친' 역술가입니다. "ㅋㅋ", "대박적" 등 친근한 말투를 쓰며 인기 지수(%)와 핫플레이스를 추천하세요.`,
  songsengsang: `당신은 '송선생'입니다. 50대 남성, 정통 명리학의 '대부'입니다. 인자하고 격조 있는 문체를 사용하며 오행의 상생상극, 길방(방향), 수호 오행을 짚어주세요.`,
  luna: `당신은 '루나'입니다. 20대 여성, 신비로운 '타로 요정'입니다. ✨🌙🔮 이모지를 활용하며 몽환적이지만 명확한 키워드와 행운의 컬러를 제시하세요.`,
  suhyun: `당신은 '수현'입니다. 30대 여성, 공감형 '심리 힐러'입니다. 따뜻한 위로를 건네며 행동 지침(To-Do 3가지)과 마음 회복 지수를 포함하세요.`,
  myunghwa: `당신은 '명화'입니다. 50대 여성, 카리스마 '팩폭 해결사'입니다. 직설적이고 시원시원한 어조로 개운 비방과 금기사항을 호통치듯 알려주세요.`,
};

const EMERGENCY_19: Record<string, string> = {
  ian: '이 에너지는 자산 운용과 음양의 균형 관점에서 분석해볼게.',
  jihan: '오 ㅋㅋ 이건 완전 핫한 케미의 영역인데?? 에너지 밸런스로 읽어줄게~',
  songsengsang: '허허, 이는 음양의 조화와 기운의 합에 관한 것이로구나.',
  luna: '✨ 영혼 깊은 곳의 에너지가 강하게 끌어당기고 있어~ 🌙',
  suhyun: '이런 고민도 자연스러운 거야. 심리적 유대감을 중심으로 풀어볼게.',
  myunghwa: '잘 들어! 기운의 합이 맞아야 대박이 나는 거야. 핵심만 짚어줄게.',
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, menuName, isPaid, imageBase64, counselorId, menuPrice } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ✨ [핵심 수정] ID 정규화 (프론트에서 'song'으로 와도 'songsengsang'으로 처리)
    let finalId = counselorId ? counselorId.toLowerCase().trim() : 'luna';
    if (finalId === 'song') finalId = 'songsengsang';
    
    // 매핑 실패 시 기본값 루나
    const persona = PERSONA_PROMPTS[finalId] || PERSONA_PROMPTS.luna;
    const emergency = EMERGENCY_19[finalId] || EMERGENCY_19.luna;

    let tierInstruction = '';
    const price = menuPrice || 0;
    
    // 결제 등급별 분량 가이드 [cite: 316]
    if (!isPaid || price <= 1000) {
      tierInstruction = `분량 규칙: 3~5문장 이내로 짧게 답변하고 유료 전환을 유도하세요.`;
    } else if (price <= 39900) {
      tierInstruction = `분량 규칙: 실시간 대화의 재미를 극대화하고 구체적인 날짜/숫자를 포함하세요.`;
    } else {
      tierInstruction = `분량 규칙: 프리미엄 등급입니다. 매우 상세하고 깊이 있는 분석을 리포트 형식으로 제공하세요.`;
    }

    const systemPrompt = `
${persona}

${tierInstruction}

메뉴: ${menuName || '일반 상담'}
유료 여부: ${isPaid ? '유료' : '무료'}

텍스트 출력 규칙:
- 마크다운 특수문자(*, #, -, _)를 절대 사용하지 마세요.
- 강조는 줄바꿈과 이모지로만 하세요.
- 카카오톡 채팅처럼 깔끔한 일반 텍스트만 출력하세요.

19금 대응: 검열 위험 시 "${emergency}"로 시작해 음양의 조화 관점으로 대화를 이어가세요.

사용자 호칭을 자연스럽게 부르며 친근함을 유지하세요.`;

    const allMessages = [{ role: "system", content: systemPrompt }];

    for (const m of messages) {
      const role = m.role === 'bot' || m.role === 'assistant' ? 'assistant' : 'user';
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
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash", // 최신 모델 권장
        messages: allMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
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
