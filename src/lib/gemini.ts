import { supabase } from "@/integrations/supabase/client";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/howl-chat`;

interface ChatHistoryMessage {
  role: 'bot' | 'user';
  content: string;
}

export async function getGeminiResponse(
  userInput: string,
  history: ChatHistoryMessage[],
  menuName?: string,
  isPaid?: boolean,
  imageBase64?: string,
): Promise<string> {
  // Build messages from history + current input
  const messages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userInput },
  ];

  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, menuName, isPaid, imageBase64 }),
    });

    if (!resp.ok) {
      if (resp.status === 429) throw new Error("rate_limited");
      if (resp.status === 402) throw new Error("credits_exhausted");
      throw new Error(`API error ${resp.status}`);
    }

    if (!resp.body) throw new Error("No response body");

    // Parse SSE stream
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let result = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) result += content;
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    return result || "기운이 잠시 흔들렸어... 다시 한번 물어봐줄래? ✨";
  } catch (error) {
    console.error("Chat API error:", error);
    if ((error as Error).message === "rate_limited") {
      return "요청이 너무 많아서 기운이 잠시 흔들렸어... 조금만 기다렸다가 다시 물어봐줘! ✨";
    }
    return "천상계와의 연결이 잠시 끊겼어... 조금 후에 다시 시도해줘! 🌟";
  }
}
