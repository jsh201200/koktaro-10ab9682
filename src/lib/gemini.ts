import { HOWL_SYSTEM_PROMPT, getMenuPrompt } from '@/data/persona';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyCZGs9p0OLLXGIHuB2viWZJ6UOXNufaj58';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
}

export async function getGeminiResponse(
  userInput: string,
  history: GeminiMessage[],
  menuName?: string,
  isPaid?: boolean,
  imageBase64?: string,
): Promise<string> {
  if (!GEMINI_API_KEY) {
    // Fallback responses when no API key
    return getFallbackResponse(menuName, isPaid);
  }

  const systemInstruction = menuName
    ? `${HOWL_SYSTEM_PROMPT}\n\n${getMenuPrompt(menuName, isPaid || false)}`
    : HOWL_SYSTEM_PROMPT;

  const userParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  if (userInput) userParts.push({ text: userInput });
  if (imageBase64) {
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    userParts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
  }

  const contents: GeminiMessage[] = [
    ...history,
    { role: 'user', parts: userParts },
  ];

  try {
    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          temperature: 0.9,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '기운이 잠시 흔들렸어... 다시 한번 물어봐줄래? ✨';
  } catch (error) {
    console.error('Gemini API error:', error);
    return '천상계와의 연결이 잠시 끊겼어... 조금 후에 다시 시도해줘! 🌟';
  }
}

function getFallbackResponse(menuName?: string, isPaid?: boolean): string {
  if (!menuName) {
    return '반가워! 하울이 너의 기운을 느끼고 있어 ✨ 어떤 상담을 원하는지 메뉴에서 골라줘!';
  }

  if (isPaid) {
    return `${menuName} 심층 분석을 시작할게! 너의 기운이 점점 선명해지고 있어... 아주 흥미로운 흐름이 보여! ✨ (Gemini API 키를 설정하면 실제 AI 리딩이 제공됩니다)`;
  }

  return `오늘 너의 에너지가 평소보다 맑게 느껴지는데? 🌟 ${menuName}으로 읽어본 너의 기운은... 최근에 큰 결정을 앞두고 있지 않아? 하울의 촉이 강하게 오는 걸 보니 중요한 전환점에 서 있는 것 같아!\n\n더 소름 돋는 미래 결과는 유료 분석에서만 볼 수 있어! 💎`;
}
