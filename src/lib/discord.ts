const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1482723430779457708/Hr3kB3PLBdyx0dn9XN90BYy7mQCXaBF4QgEXS6ZsbzLYPkM5wz4z0cpVp_w7Fh3cbwQy';

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
  const methodLabel = data.method === 'kakaopay' ? '카카오페이 결제 시도' : data.method === 'bank' ? '무통장 입금 확인 필요' : '프리미엄 상담 신청';

  const fields = [
    { name: '메뉴', value: `${data.menuId}번 ${data.menuName}`, inline: true },
    { name: '가격', value: `${data.price.toLocaleString()}원`, inline: true },
    { name: '사용자', value: data.userName, inline: true },
    { name: '입금자명', value: data.depositor || '미입력', inline: true },
    { name: '전화번호 뒷자리', value: data.phoneTail || '미입력', inline: true },
    { name: '결제 방식', value: methodLabel, inline: true },
  ];

  if (data.questions?.length) {
    fields.push({
      name: '질문 목록',
      value: data.questions.map((q, i) => `${i + 1}. ${q}`).join('\n'),
      inline: false,
    });
  }

  try {
    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `[하울 상담소] ${data.price.toLocaleString()}원 ${methodLabel}! ✨`,
          color: 0xE2D1F9,
          fields,
          footer: { text: '관리자 대시보드에서 승인해주세요.' },
          timestamp: new Date().toISOString(),
        }],
      }),
    });
  } catch (e) {
    console.error('Discord webhook error:', e);
  }
}
