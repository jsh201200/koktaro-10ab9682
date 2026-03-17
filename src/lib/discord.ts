import { supabase } from "@/integrations/supabase/client";

interface PaymentAlert {
  userName: string;
  menuName: string;
  menuId: number;
  price: number;
  method: 'kakaopay' | 'bank' | 'premium';
  depositor: string;
  phoneTail: string;
  questions?: string[];
}

export async function sendDiscordAlert(data: PaymentAlert) {
  try {
    await supabase.functions.invoke('discord-alert', {
      body: data,
    });
  } catch (e) {
    console.error('Discord alert error:', e);
  }
}
