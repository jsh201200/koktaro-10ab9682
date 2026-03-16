import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import ChatHeader from '@/components/ChatHeader';
import MessageBubble from '@/components/MessageBubble';
import ChatInput from '@/components/ChatInput';
import MenuGrid from '@/components/MenuGrid';
import PaymentModal from '@/components/PaymentModal';
import PremiumForm from '@/components/PremiumForm';
import TypingIndicator from '@/components/TypingIndicator';
import { useChat } from '@/hooks/useChat';
import { Menu, MENU_WELCOME_GUIDES, MENUS } from '@/data/menus';
import { getGeminiResponse } from '@/lib/gemini';
import { sendDiscordAlert } from '@/lib/discord';
import { useSiteSettings } from '@/stores/siteSettings';
import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const KAKAO_CHANNEL = 'https://pf.kakao.com/_cLdxhX';
const TYPING_DELAY_MS = 3000;

export default function HowlChat() {
  const {
    messages, session, isTyping, setIsTyping,
    addBotMessage, addUserMessage, addSystemMessage,
    updateSession, resetSession,
  } = useChat();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showPremiumForm, setShowPremiumForm] = useState(false);
  const [sessionTime, setSessionTime] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Initial greeting - asks for nickname
  useEffect(() => {
    addBotMessage(settings.welcomeMessage);
  }, []);

  // Session timer
  useEffect(() => {
    if (session.sessionExpiry && session.isPaid) {
      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.floor((session.sessionExpiry! - Date.now()) / 1000));
        setSessionTime(remaining);
        if (remaining === 300) {
          addSystemMessage("기운이 다해가고 있어! 5분 뒤면 상담이 종료되니 서둘러줘! ✨");
        }
        if (remaining <= 0) {
          addSystemMessage("상담 세션이 만료되었습니다. 새로운 상담을 시작해주세요.");
          updateSession({ isPaid: false, sessionExpiry: null, selectedMenu: null, questionCount: 0, freeReadingDone: false });
          setSessionTime(null);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session.sessionExpiry, session.isPaid]);

  // Admin payment approval
  useEffect(() => {
    if (!window.__howl_payments) window.__howl_payments = [];
    window.__howl_approve = (paymentId: string) => {
      const payments = window.__howl_payments || [];
      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        payment.approved = true;
        updateSession({
          isPaid: true,
          sessionExpiry: Date.now() + 30 * 60 * 1000,
          maxQuestions: payment.menuId === 16 ? 3 : 1,
          questionCount: 0,
        });
        addSystemMessage("💜 결제가 승인되었습니다! 심층 리딩을 시작합니다.");
        handleBotResponse(
          `${session.userName}님의 결제가 확인되었어!`,
          payment.menuName,
          true
        );
      }
    };
  }, [session.userName]);

  const delayedTyping = useCallback((): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, TYPING_DELAY_MS));
  }, []);

  const handleBotResponse = useCallback(async (
    userInput: string,
    menuName?: string,
    isPaid?: boolean,
    imageBase64?: string,
  ) => {
    setIsTyping(true);
    try {
      // Intentional mystical delay
      await delayedTyping();

      const history = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: (m.role === 'bot' ? 'model' : 'user') as 'user' | 'model',
          parts: [{ text: m.content }],
        }));

      const response = await getGeminiResponse(
        userInput, history, menuName, isPaid, imageBase64
      );
      addBotMessage(response);
    } catch {
      addBotMessage('기운이 잠시 흔들렸어... 다시 물어봐줘! ✨');
    } finally {
      setIsTyping(false);
    }
  }, [messages, addBotMessage, setIsTyping, delayedTyping]);

  const handleSend = async (text: string, image?: string) => {
    // Admin shortcut
    if (text.startsWith('9304 ') && text.split(' ').length >= 2) {
      const targetName = text.slice(5).trim();
      const payments = window.__howl_payments || [];
      const match = payments.find(p => p.userName === targetName && !p.approved);
      if (match) {
        window.__howl_approve?.(match.id);
        addSystemMessage(`✅ ${targetName}님의 입금이 확인되었습니다.`);
        return;
      }
    }

    addUserMessage(text, image);

    // Name/nickname collection
    if (!session.userName) {
      const name = text.trim().replace(/[^가-힣a-zA-Z0-9\s]/g, '').trim();
      if (name) {
        updateSession({ userName: name });
        setIsTyping(true);
        await delayedTyping();
        setIsTyping(false);
        addBotMessage(`${name}! 좋은 호칭이야 ✨\n\n너의 기운이 살랑살랑 느껴지기 시작했어. 어떤 운명의 문을 열어볼까?\n\n아래 '메뉴 보기' 버튼을 눌러 상담 메뉴를 확인해줘! 🔮`);
        return;
      }
      addBotMessage('호칭을 한번 더 알려줄래? 한글이나 영어로 입력해줘! ✨');
      return;
    }

    // Check session limits
    if (session.isPaid && session.selectedMenu) {
      if (session.questionCount >= session.maxQuestions + 1) {
        addBotMessage("이번 고민에 대한 기운은 여기까지야! 더 깊은 상담이나 다른 고민은 메뉴에서 새로 골라줘! 🌟");
        updateSession({ isPaid: false, selectedMenu: null, freeReadingDone: false, questionCount: 0, sessionExpiry: null });
        setSessionTime(null);
        return;
      }
      updateSession({ questionCount: session.questionCount + 1 });
    }

    // Image fail tracking
    if (image && session.selectedMenu && [2, 12].includes(session.selectedMenu.id)) {
      const newCount = session.imageFailCount + 1;
      if (newCount >= 3) {
        addBotMessage(`사진 인식이 계속 어려운 상태야 😢 관리자에게 직접 문의해줘!\n\n📱 카카오톡 상담: ${KAKAO_CHANNEL}`);
        updateSession({ imageFailCount: 0 });
        return;
      }
      updateSession({ imageFailCount: newCount });
    }

    await handleBotResponse(
      text,
      session.selectedMenu?.name,
      session.isPaid,
      image,
    );

    // After free reading, offer payment
    if (session.selectedMenu && !session.isPaid && !session.freeReadingDone) {
      updateSession({ freeReadingDone: true });
      setTimeout(() => {
        addBotMessage(`더 소름 돋는 미래 결과는 유료 분석에서만 볼 수 있어! 💎\n\n[1. 방금 내용 더 상세히 분석]\n\n아래 결제 버튼을 눌러 심층 리딩을 시작해봐!`);
      }, 1500);
    }
  };

  const handleMenuSelect = async (menu: Menu) => {
    setIsMenuOpen(false);
    updateSession({ selectedMenu: menu, freeReadingDone: false, questionCount: 0, imageFailCount: 0 });

    if (menu.id === 16) {
      setShowPremiumForm(true);
      return;
    }

    addSystemMessage(`${menu.icon} ${menu.name} 상담을 시작합니다`);

    // Show welcome guide first
    const guide = MENU_WELCOME_GUIDES[menu.id];
    if (guide) {
      setIsTyping(true);
      await delayedTyping();
      setIsTyping(false);
      const userName = session.userName;
      addBotMessage(`${userName}님, ${guide}`);
    }
  };

  const handlePaymentSubmit = (method: 'kakaopay' | 'bank', depositor: string, phoneTail: string) => {
    const menu = session.selectedMenu!;
    setShowPayment(false);

    const paymentId = `pay-${Date.now()}`;
    const chatLog = messages.map(m => `[${m.role}] ${m.content}`);

    if (!window.__howl_payments) window.__howl_payments = [];
    window.__howl_payments.push({
      id: paymentId,
      userName: session.userName,
      menuName: menu.name,
      menuId: menu.id,
      price: menu.price,
      method,
      depositor,
      phoneTail,
      timestamp: Date.now(),
      approved: false,
      chatLog,
    });

    updateSession({ paymentPending: true });

    sendDiscordAlert({
      userName: session.userName,
      menuName: menu.name,
      menuId: menu.id,
      price: menu.price,
      method,
      depositor,
      phoneTail,
    });

    if (method === 'kakaopay') {
      addSystemMessage('카카오페이 결제 요청이 전송되었습니다');
      addBotMessage('카카오페이 결제 링크가 열렸어! 결제가 확인되면 바로 심층 리딩을 시작할게 ✨\n\n관리자가 확인 중이니 잠시만 기다려줘!');
    } else {
      addSystemMessage('무통장 입금 확인 요청이 전송되었습니다');
      addBotMessage('입금 확인 요청을 보냈어! 관리자가 확인하면 바로 심층 리딩이 시작될 거야 ✨\n\n카카오뱅크 3333-36-8761312 (정승하)로 입금해줘!');
    }
  };

  const handlePremiumSubmit = (questions: string[], depositor: string, phoneTail: string) => {
    setShowPremiumForm(false);
    const menu = { id: 16, name: '종합운명분석', price: 59000 } as Menu;
    updateSession({ selectedMenu: menu, paymentPending: true });

    if (!window.__howl_payments) window.__howl_payments = [];
    window.__howl_payments.push({
      id: `pay-${Date.now()}`,
      userName: session.userName,
      menuName: '종합운명분석',
      menuId: 16,
      price: 59000,
      method: 'premium',
      depositor,
      phoneTail,
      timestamp: Date.now(),
      approved: false,
      chatLog: messages.map(m => `[${m.role}] ${m.content}`),
      questions,
    });

    sendDiscordAlert({
      userName: session.userName,
      menuName: '종합운명분석',
      menuId: 16,
      price: 59000,
      method: 'premium',
      depositor,
      phoneTail,
      questions,
    });

    addSystemMessage('💎 프리미엄 상담 신청이 접수되었습니다');
    addBotMessage('프리미엄 종합운명분석 신청이 완료됐어! ✨\n\n결제 확인 후 하울이 직접 심층 리포트를 작성해줄게. 잠시만 기다려줘!\n\n카카오뱅크 3333-36-8761312 (정승하)로 59,000원 입금 후 기다려주면 돼!');
  };

  return (
    <div className="min-h-svh aurora-bg">
      <ChatHeader sessionTime={sessionTime} />

      <main className="pt-20 pb-36 px-4 max-w-2xl mx-auto space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>
        {isTyping && <TypingIndicator />}
        <div ref={chatEndRef} />
      </main>

      <ChatInput
        onSend={handleSend}
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        disabled={isTyping}
        placeholder={!session.userName ? '호칭을 입력해줘...' : '하울에게 메시지 보내기...'}
      />

      {session.freeReadingDone && !session.isPaid && session.selectedMenu && (
        <div className="fixed bottom-[120px] w-full px-4 z-40">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => {
                if (session.selectedMenu?.id === 16) {
                  setShowPremiumForm(true);
                } else {
                  setShowPayment(true);
                }
              }}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg glow-border-hover transition-all active:scale-[0.98] animate-pulse"
            >
              💎 결제하고 계속보기 ({session.selectedMenu.price.toLocaleString()}원)
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isMenuOpen && (
          <MenuGrid onSelect={handleMenuSelect} onClose={() => setIsMenuOpen(false)} />
        )}
      </AnimatePresence>

      {showPayment && session.selectedMenu && (
        <PaymentModal
          menu={session.selectedMenu}
          userName={session.userName}
          onClose={() => setShowPayment(false)}
          onPaymentSubmit={handlePaymentSubmit}
        />
      )}

      {showPremiumForm && (
        <PremiumForm
          userName={session.userName}
          onSubmit={handlePremiumSubmit}
          onClose={() => setShowPremiumForm(false)}
        />
      )}

      <div className="fixed bottom-0 w-full text-center pb-1 z-30 pointer-events-none">
        <p className="text-[8px] text-muted-foreground/60 max-w-2xl mx-auto px-4">
          본 상담은 엔터테인먼트 콘텐츠이며, 의학적·법률적·재무적 자문을 대체할 수 없습니다.
        </p>
      </div>
    </div>
  );
}
