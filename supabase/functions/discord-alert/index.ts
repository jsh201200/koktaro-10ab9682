import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userName, menuName, menuId, price, method, depositor, phoneTail, questions } = await req.json();

    // Get discord webhook from site_config
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: configRow } = await supabase
      .from("site_config")
      .select("value")
      .eq("key", "discordWebhook")
      .single();

    const webhook = configRow?.value as string || "https://discord.com/api/webhooks/1482723430779457708/Hr3kB3PLBdyx0dn9XN90BYy7mQCXaBF4QgEXS6ZsbzLYPkM5wz4z0cpVp_w7Fh3cbwQy";

    if (!webhook) {
      return new Response(JSON.stringify({ ok: false, error: "No webhook configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const methodLabel = method === "kakaopay" ? "카카오페이 결제 시도" : method === "bank" ? "무통장 입금 확인 필요" : "프리미엄 상담 신청";

    const fields = [
      { name: "메뉴", value: `${menuId}번 ${menuName}`, inline: true },
      { name: "가격", value: `${Number(price).toLocaleString()}원`, inline: true },
      { name: "사용자", value: userName, inline: true },
      { name: "입금자명", value: depositor || "미입력", inline: true },
      { name: "전화번호 뒷자리", value: phoneTail || "미입력", inline: true },
      { name: "결제 방식", value: methodLabel, inline: true },
    ];

    if (questions?.length) {
      fields.push({
        name: "질문 목록",
        value: questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n"),
        inline: false,
      });
    }

    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: `[하울 상담소] ${Number(price).toLocaleString()}원 ${methodLabel}! ✨`,
          color: 0xE2D1F9,
          fields,
          footer: { text: "관리자 대시보드에서 승인해주세요." },
          timestamp: new Date().toISOString(),
        }],
      }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("discord-alert error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
