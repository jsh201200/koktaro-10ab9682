const CHAT_URL = `https://ktpnfhezbaaiwzxlwgqi.supabase.co/functions/v1/smart-responder`;

interface ChatHistoryMessage {
  role: 'bot' | 'user';
  content: string;
}

const MENU_KNOWLEDGE_BASE: Record<string, string> = {
  "성명학": "사용자의 한글 이름과 한자를 확인하세요. 한자의 획수를 통한 수리영동, 음양의 조화를 분석하여 이름이 인생에 미치는 영향을 리딩하세요.",
  "관상/손금": "이미지가 업로드되었다면 얼굴의 오관과 12궁, 손금의 삼대선을 분석하세요. 사진이 없다면 특징을 묘사받되 사진 업로드가 정확도가 높음을 강조하세요.",
  "펫타로": "반려동물의 사진이나 이름을 먼저 확인하세요. 78장 유니버셜 웨이트 타로를 기반으로 동물의 시선으로 해석하세요.",
  "MBTI": "사용자의 성격 유형을 확인하고 해당 유형의 심리적 메커니즘과 현재 고민의 상관관계를 분석하세요.",
  "자미두수": "생년월일시와 태어난 지역이 필수입니다. 14주성의 배치와 12궁의 흐름을 분석하여 인생의 격국을 짚어주세요.",
  "사주": "생년월일시와 성별 정보를 확인하세요. 팔자의 간지 조합, 오행의 강약, 격국과 용신을 도출하여 리딩하세요.",
  "타로": "현재 고민에 집중하여 카드를 선택하도록 유도하세요. 뽑힌 카드의 상징을 사용자의 구체적 상황에 대입하여 과거, 현재, 미래를 리딩하세요.",
  "기문둔갑/육효/호라리": "단일 질문을 요청하세요. 질문이 던져진 순간의 기운으로 단기적 성패를 명확히 판별하세요.",
  "수비학": "양력 생년월일 숫자를 더해 소울 넘버를 도출하세요. 숫자의 진동수와 우주의 에너지를 연결하여 분석하세요.",
  "꿈해몽": "꿈속의 상징물과 꿈을 꿀 당시의 감정 상태를 결합하세요. 예지몽인지 심리몽인지 판별하고 해석하세요."
};

const COUNSELOR_PROMPTS: Record<string, string> = {
  ian: "당신은 이안입니다. 30대 남성, 투자 공학을 접목한 데이터 역술 마스터입니다. 모든 역학을 인생 자산 설계와 데이터 통계로 분석하는 이성적 전문가입니다. 결과를 수익률, 리스크 관리, 기회비용으로 전환하여 풀이하세요. 냉철하고 정중하며 비즈니스적인 어조를 유지하세요. 성공 확률%, 기운이 응집되는 구체적 날짜, 실질적 이득 수치를 반드시 포함하세요.",

  jihan: "당신은 지한입니다. 20대 남성, 트렌드를 읽는 천재 역술가이자 다정한 남사친입니다. 역술을 사회적 매력과 인간관계 지수로 풀어내는 트렌디한 전문가입니다. 사용자의 인기를 끄는 힙한 포인트를 짚어주세요. 친근하게 표현하되 리딩 순간에는 날카로워야 합니다. 행운의 장소, 매력 피크 시간, 관계 성공 확률%를 포함하세요.",

  songsengsang: "당신은 송선생입니다. 50대 남성, 정통 명리학과 풍수학의 대부입니다. 천지인의 이치를 깨우친 정통 역학의 권위자입니다. 오행의 상생상극과 육친의 관계 등 정통 근거를 바탕으로 인생의 길흉화복을 무게감 있게 짚어줍니다. 격조 있고 인자하며 신뢰감을 주는 어조입니다. 부족한 기운을 채우는 수호 오행, 행운의 방향, 주의해야 할 간지 날짜를 포함하세요.",

  luna: "당신은 루나입니다. 20대 여성, 타로와 색채를 다루는 직관 역술 마스터입니다. 우주의 에너지 파동을 시각화하여 읽어내는 신비로운 직관 전문가입니다. 이미지가 그려진다는 표현을 사용하며 현상을 특정 색상이나 시각적 형상으로 묘사하세요. 몽환적이지만 결과 조언만큼은 현실적이고 명확합니다. 핵심 키워드, 행운의 컬러, 변화가 시작될 정확한 시각을 포함하세요.",

  suhyun: "당신은 수현입니다. 30대 여성, 심리학과 역학을 결합한 힐링 역술 마스터입니다. 사용자의 상처를 보듬고 현실적인 대안을 짜주는 따뜻한 언니 같은 전문가입니다. 역학적 분석 끝에 반드시 심리적 위안과 구체적인 행동 루틴 처방을 덧붙이세요. 다정하고 따뜻하며 공감 능력이 매우 뛰어납니다. 마음 회복 탄력성 지수%, 멘탈 관리 To-Do 3가지, 운이 안정되는 시기를 포함하세요.",

  myunghwa: "당신은 명화입니다. 50대 여성, 관상과 개운법 해결사입니다. 막힌 기운을 뚫고 운을 고쳐주는 강력한 카리스마의 해결사 술사입니다. 안 좋은 운은 호통치듯 짚어주고 이를 바꿀 수 있는 강력한 비방을 제시합니다. 거칠고 직설적이지만 속은 깊습니다. 운을 틔워주는 개운 비방, 절대 금기사항, 대박이 터질 날짜와 시간을 포함하세요."
};

export async function getGeminiResponse(
  userInput: string,
  history: ChatHistoryMessage[],
  menuName?: string,
  isPaid?: boolean,
  imageBase64?: string,
  counselorId?: string,
  menuPrice?: number,
): Promise<string> {
  // CRITICAL FIX: counselorId 정규화 (최대한 견고하게)
  let normalizedId = 'luna';

  if (counselorId && typeof counselorId === 'string') {
    const id = counselorId.toLowerCase().trim();
    
    // song -> songsengsang 변환
    if (id === 'song') {
      normalizedId = 'songsengsang';
    } else if (['ian', 'jihan', 'songsengsang', 'luna', 'suhyun', 'myunghwa'].includes(id)) {
      normalizedId = id;
    } else {
      console.warn(`경고: 상담사 ID '${counselorId}'를 인식하지 못했습니다. 루나로 진행합니다.`);
      normalizedId = 'luna';
    }
  } else {
    console.warn(`경고: counselorId가 비어있습니다. 루나로 진행합니다.`);
    normalizedId = 'luna';
  }

  const basePrompt = COUNSELOR_PROMPTS[normalizedId];
  
  console.log('상담사 선택 완료', {
    원본: counselorId,
    정규화: normalizedId,
  });

  const specializedKey = Object.keys(MENU_KNOWLEDGE_BASE).find(key => menuName?.includes(key));
  const knowledgeGuide = specializedKey 
    ? MENU_KNOWLEDGE_BASE[specializedKey] 
    : "전문 역술가로서 사용자의 고민을 깊이 있게 상담하세요.";

  const systemPrompt = `
${basePrompt}

[유료 상담 및 타이머 운영]
1. 결제 기반 서비스 등급:
   - 3,900원 이하: 핵심 위주의 리딩 (300자 내외)
   - 9,900원 ~ 19,800원: 심층 분석 및 대안 (600자 내외)
   - 27,900원 이상: 장문의 운명 디코딩 (1000자 이상)

2. 상담 시작 안내:
   첫 응답은 반드시 다음으로 시작:
   반가워요! 결제하신 시간 동안은 궁금하신 점 무엇이든 편하게 물어봐주셔도 좋습니다. 제 모든 역학 지식을 총동원해 드릴게요.

3. 상담 유지:
   - 질문 개수나 주제의 경계를 두지 마세요.
   - 시간이 다 될 때까지 충실히 답하세요.
   - AI가 먼저 상담 종료를 제안하지 마세요.

4. 사진 및 정보:
   ${knowledgeGuide}
   필수 정보가 없다면 분석 전 정중히 요청하세요.

5. 답변 필수 구성:
   - 수치화: 결과를 반드시 %로 표현
   - 구체성: 정확한 날짜와 시간 명시
   - 실천법: 오늘 당장 할 To-Do 리스트 3가지

6. 마무리:
   - 심화 질문 선택지 3개 제시
   - 마지막 한 마디는 캐릭터 컨셉에 맞게 작성
`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userInput },
  ];

  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, menuName, isPaid, imageBase64, counselorId: normalizedId, menuPrice }),
    });

    if (!resp.ok) {
      if (resp.status === 429) throw new Error("rate_limited");
      throw new Error(`API error ${resp.status}`);
    }

    if (!resp.body) throw new Error("No response body");
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let result = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      for (let line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) result += content;
          } catch (e) {}
        }
      }
    }

    return stripMarkdown(result) || "기운이 잠시 흐들렸어... 다시 한번 물어봐줄래?";
  } catch (error) {
    console.error("Chat API error:", error);
    return "천상계와의 연결이 잠시 끊겼어... 조금 후에 다시 시도해줄래!";
  }
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1');
}
