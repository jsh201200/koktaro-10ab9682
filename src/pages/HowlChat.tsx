import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import ChatHeader from '@/components/ChatHeader';
import MessageBubble from '@/components/MessageBubble';
import ChatInput from '@/components/ChatInput';
import MenuGrid from '@/components/MenuGrid';
import PaymentModal from '@/components/PaymentModal';
import PremiumForm from '@/components/PremiumForm';
import TypingIndicator from '@/components/TypingIndicator';
import LandingPage from '@/components/LandingPage';
import PhoneAuth from '@/components/PhoneAuth';
import ConsultTimer from '@/components/ConsultTimer';
import ReviewModal from '@/components/ReviewModal';
import ScanAnimation from '@/components/ScanAnimation';
import { useChat } from '@/hooks/useChat';
import { Menu, MENU_WELCOME_GUIDES, MENUS } from '@/data/menus';
import { getCounselorForMenu } from '@/data/counselors';
import { getGeminiResponse } from '@/lib/gemini';
import { sendDiscordAlert } from '@/lib/discord';
import { useSiteSettings } from '@/stores/siteSettings';
import { supabase } from '@/integrations/supabase/client';
import { Settings, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const TYPING_DELAY_MS = 2000;

interface UserProfile {
  id: string;
  phone: string;
  nickname: string;
  credits: number;
  birth_date?: string;
  birth_time?: string;
  gender?: string;
}

export default function HowlChat() {
  const {
    messages, session, isTyping, setIsTyping,
    addBotMessage, addUserMessage, addSystemMessage,
    updateSession, resetSession,
  } = useChat();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [view, setView] = useState<'landing' | 'auth' | 'chat'>('landing');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showPremiumForm, setShowPremiumForm] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showScan, setShowScan] = useState<string | null>(null);
  const [sessionTime, setSessionTime] = useState<number | null>(null);
  const [timerExpired, setTimerExpired] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [showBetaModal, setShowBetaModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const greetingSent = useRef(false);

  const couponCode = searchParams.get('coupon');
  const couponActive = !!couponCode;

  // Load products from DB
  useEffect(() => {
    const loadProducts = async () => {
      const { data } = await supabase.from('products').select('*').eq('enabled', true).order('sort_order');
      if (data) setDbProducts(data);
    };
    loadProducts();
  }, []);

  useEffect(() => {
    const profileId = localStorage.getItem('howl_profile_id');
    if (profileId) {
      supabase.from('user_profiles').select('*').eq('id', profileId).single().then(({ data }) => {
        if (data) {
          setUserProfile({
            id: data.id,
            phone: data.phone,
            nickname: data.nickname || '',
            credits: data.credits || 0,
            birth_date: data.birth_date || undefined,
            birth_time: data.birth_time || undefined,
            gender: data.gender || undefined,
          });
        }
      });
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (view === 'chat' && !greetingSent.current && messages.length === 0) {
      greetingSent.current = true;
      const name = userProfile?.nickname || session.userName;
      setTimeout(() => {
        if (name) {
          addBotMessage(`${name}님, 다시 만나서 반가워! ✨\n\n어떤 운명의 문을 열어볼까?\n아래 '메뉴 보기'를 눌러봐! 🔮`);
        } else {
          addBotMessage(settings.welcomeMessage);
        }
      }, 500);
    }
  }, [view, messages.length]);

  useEffect(() => {
    if (session.sessionExpiry && session.isPaid) {
      setTimerExpired(false);
      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.floor((session.sessionExpiry! - Date.now()) / 1000));
        setSessionTime(remaining);
        if (remaining === 300) {
          addSystemMessage("기운이 다해가고 있어! 5분 뒤면 상담이 종료되니 서둘러줘! ✨");
        }
        if (remaining === 60) {
          addSystemMessage("⏰ 1분 남았어! 마지막으로 궁금한 거 물어봐줄래?");
        }
        if (remaining <= 0) {
          setTimerExpired(true);
          addSystemMessage("⏰ 상담 시간이 종료되었습니다.");
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session.sessionExpiry, session.isPaid]);

  useEffect(() => {
    if (!session.dbSessionId) return;
    const channel = supabase
      .channel('payment-approval')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'payments',
        filter: `session_id=eq.${session.dbSessionId}`,
      }, (payload) => {
        const updated = payload.new as any;
        if (updated.status === 'approved') {
          const product = dbProducts.find(p => p.menu_id === updated.menu_id);
          const durationMin = product?.duration_minutes || 30;
          activatePaidMode(durationMin, updated.menu_id, updated.menu_name, updated.price);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session.dbSessionId, session.userName, dbProducts]);

  const activatePaidMode = (durationMin: number, menuId: number, menuName: string, price: number) => {
    updateSession({
      isPaid: true,
      sessionExpiry: Date.now() + durationMin * 60 * 1000,
      maxQuestions: menuId === 16 ? 3 : 1,
      questionCount: 0,
      paymentPending: false,
    });
    setTimerExpired(false);
    setShowBetaModal(false);
    addSystemMessage("💜 결제가 승인되었습니다! 심층 리딩을 시작합니다.");
    toast.success("입금 확인 완료! 상담을 이어갑니다 ✨");

    const counselor = getCounselorForMenu(menuId);
    const name = session.userName || userProfile?.nickname || '';
    handleBotResponse(
      `${name}님의 결제가 확인되었어! 이제 심층 리딩을 시작할게.`,
      menuName,
      true,
      undefined,
      counselor.id,
      price
    );
  };

  const delayedTyping = useCallback((): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, TYPING_DELAY_MS));
  }, []);

  const getDbPrice = (menuId: number): number => {
    const product = dbProducts.find(p => p.menu_id === menuId);
    return product?.price || 0;
  };

  const handleBotResponse = useCallback(async (
    userInput: string,
    menuName?: string,
    isPaid?: boolean,
    imageBase64?: string,
    counselorId?: string,
    menuPrice?: number,
  ) => {
    setIsTyping(true);
    try {
      await delayedTyping();
      const history = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role as 'bot' | 'user', content: m.content }));

      const response = await getGeminiResponse(
        userInput, history, menuName, isPaid, imageBase64, counselorId, menuPrice
      );
      addBotMessage(response);
    } catch {
      addBotMessage('기운이 잠시 흔들렸어... 다시 물어봐줘! ✨');
    } finally {
      setIsTyping(false);
    }
  }, [messages, addBotMessage, setIsTyping, delayedTyping]);

  const handleSend = async (text: string, image?: string) => {
    addUserMessage(text, image);

    if (!session.userName && !userProfile?.nickname) {
      const name = text.trim().replace(/[^가-힣a-zA-Z0-9\s]/g, '').trim();
      if (name) {
        updateSession({ userName: name });
        setIsTyping(true);
        await delayedTyping();
        setIsTyping(false);
        addBotMessage(`${name}! 좋은 호칭이야 ✨\n\n어떤 운명의 문을 열어볼까?\n아래 '메뉴 보기' 버튼을 눌러 상담 메뉴를 확인해줘! 🔮`);
        return;
      }
      addBotMessage('호칭을 한번 더 알려줄래? 한글이나 영어로 입력해줘! ✨');
      return;
    }

    if (timerExpired) {
      if (settings.betaMode) {
        setShowBetaModal(true);
      } else {
        addBotMessage('⏰ 상담 시간이 종료됐어! 더 깊은 상담을 원한다면 연장 결제를 해줘! ✨');
      }
      return;
    }

    if (session.isPaid && session.selectedMenu) {
      if (session.questionCount >= session.maxQuestions + 1) {
        addBotMessage("이번 고민에 대한 기운은 여기까지야! 더 깊은 상담은 메뉴에서 새로 골라줘! 🌟");
        updateSession({ isPaid: false, selectedMenu: null, freeReadingDone: false, questionCount: 0, sessionExpiry: null });
        setSessionTime(null);
        setShowReview(true);
        return;
      }
      updateSession({ questionCount: session.questionCount + 1 });
    }

    if (image && session.selectedMenu && [2, 12].includes(session.selectedMenu.id)) {
      setShowScan(image);
      return;
    }

    const counselor = session.selectedMenu ? getCounselorForMenu(session.selectedMenu.id) : undefined;

    await handleBotResponse(
      text,
      session.selectedMenu?.name,
      session.isPaid,
      image,
      counselor?.id,
      session.selectedMenu ? getDbPrice(session.selectedMenu.id) : undefined,
    );

    if (session.selectedMenu && !session.isPaid && !session.freeReadingDone) {
      updateSession({ freeReadingDone: true });
      setTimeout(() => {
        addBotMessage(`이 기운의 핵심은 심층 리딩에서만 볼 수 있어! 💎\n\n지금 바로 확인해볼래?`);
      }, 1500);
    }
  };

  const handleMenuSelect = async (menu: Menu) => {
    setIsMenuOpen(false);

    // ✨ room_id 생성 (도사ID + 타임스탬프)
    const counselor = getCounselorForMenu(menu.id);
    const roomId = `room_${counselor.id}_${Date.now()}`;

    const dbProduct = dbProducts.find(p => p.menu_id === menu.id);
    const actualMenu = dbProduct ? { ...menu, price: dbProduct.price, name: dbProduct.name } : menu;

    updateSession({
      selectedMenu: actualMenu,
      freeReadingDone: false,
      questionCount: 0,
      imageFailCount: 0,
      userName: session.userName || userProfile?.nickname || '',
      roomId, // ✨ room_id 저장
    });

    if (menu.id === 16) {
      setShowPremiumForm(true);
      return;
    }

    addSystemMessage(`${actualMenu.icon} ${counselor.name}의 ${actualMenu.name} 상담을 시작합니다`);

    const guide = MENU_WELCOME_GUIDES[menu.id];
    if (guide) {
      setIsTyping(true);
      await delayedTyping();
      setIsTyping(false);
      const name = session.userName || userProfile?.nickname || '';
      addBotMessage(`${name}${name ? '님, ' : ''}${guide}`);
    }
  };

  const handleScanComplete = async () => {
    const image = showScan;
    setShowScan(null);
    if (!image) return;

    const counselor = session.selectedMenu ? getCounselorForMenu(session.selectedMenu.id) : undefined;
    await handleBotResponse(
      '사진을 분석해줘',
      session.selectedMenu?.name,
      session.isPaid,
      image,
      counselor?.id,
      session.selectedMenu ? getDbPrice(session.selectedMenu.id) : undefined,
    );
  };

  const handleBetaBypass = () => {
    if (!session.selectedMenu) return;
    const product = dbProducts.find(p => p.menu_id === session.selectedMenu!.id);
    const durationMin = product?.duration_minutes || 30;
    activatePaidMode(durationMin, session.selectedMenu.id, session.selectedMenu.name, 0);
    toast.success("🎉 무료 베타 테스트 모드로 상담을 이어갑니다!");
  };

  const handleExitChat = async (deleteChat: boolean) => {
    setShowExitModal(false);
    
    if (deleteChat) {
      // ✨ 대화 내용 삭제
      await supabase.from('messages').delete().eq('session_id', session.dbSessionId);
      addSystemMessage("대화 내용이 삭제되었습니다.");
    }
    
    resetSession();
    setView('landing');
    toast.info("상담을 종료했습니다 ✨");
  };

  const handlePaymentSubmit = async (method: 'kakaopay' | 'bank', depositor: string, phoneTail: string) => {
    const menu = session.selectedMenu!;
    setShowPayment(false);

    const dbPrice = getDbPrice(menu.id);
    let discountAmount = 0;
    let discountType = '';
    let finalPrice = dbPrice;

    if (couponActive && dbPrice >= 9900) {
      discountAmount = 3000;
      discountType = 'howland_coupon';
      finalPrice = dbPrice - 3000;
    }

    const chatLog = messages.map(m => `[${m.role}] ${m.content}`);

    await supabase.from('payments').insert({
      session_id: session.dbSessionId,
      user_nickname: session.userName || userProfile?.nickname || '',
      menu_name: menu.name,
      menu_id: menu.id,
      price: dbPrice,
      method,
      depositor,
      phone_tail: phoneTail,
      chat_log: chatLog,
      status: 'pending',
      discount_amount: discountAmount,
      discount_type: discountType,
      final_price: finalPrice,
    });

    updateSession({ paymentPending: true });

    sendDiscordAlert({
      userName: session.userName || userProfile?.nickname || '',
      menuName: menu.name,
      menuId: menu.id,
      price: finalPrice,
      method,
      depositor,
      phoneTail,
    });

    if (method === 'kakaopay') {
      addSystemMessage('카카오페이 결제 요청이 전송되었습니다');
      addBotMessage(`카카오페이 결제 링크가 열렸어! 관리자가 확인 중이니 잠시만 기다려줘 ✨\n\n결제 금액: ${finalPrice.toLocaleString()}원${discountAmount > 0 ? ` (${discountAmount.toLocaleString()}원 할인 적용)` : ''}`);
    } else {
      addSystemMessage('무통장 입금 확인 요청이 전송되었습니다');
      addBotMessage(`입금 확인 요청을 보냈어! ✨\n\n금액: ${finalPrice.toLocaleString()}원${discountAmount > 0 ? ` (${discountAmount.toLocaleString()}원 할인)` : ''}\n\n관리자가 확인하면 바로 상담을 이어갈게!`);
    }
  };

  const handlePremiumSubmit = async (questions: string[], depositor: string, phoneTail: string) => {
    setShowPremiumForm(false);
    const dbProduct = dbProducts.find(p => p.menu_id === 16);
    const price = dbProduct?.price || 59000;
    const menu = { id: 16, name: dbProduct?.name || '종합운명분석', price } as Menu;
    updateSession({ selectedMenu: menu, paymentPending: true });

    const chatLog = messages.map(m => `[${m.role}] ${m.content}`);

    await supabase.from('payments').insert({
      session_id: session.dbSessionId,
      user_nickname: session.userName || userProfile?.nickname || '',
      menu_name: menu.name,
      menu_id: 16,
      price,
      method: 'premium',
      depositor,
      phone_tail: phoneTail,
      chat_log: chatLog,
      questions,
      status: 'pending',
    });

    sendDiscordAlert({
      userName: session.userName || userProfile?.nickname || '',
      menuName: menu.name,
      menuId: 16,
      price,
      method: 'premium',
      depositor,
      phoneTail,
      questions,
    });

    addSystemMessage('💎 프리미엄 상담 신청이 접수되었습니다');
    addBotMessage(`프리미엄 종합운명분석 신청이 완료됐어! ✨\n\n금액: ${price.toLocaleString()}원\n\n결제 확인 후 심층 리포트를 작성해줄게!`);
  };

  const handleAuthComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('howl_profile_id', profile.id);
    updateSession({ userName: profile.nickname });

    if (session.dbSessionId) {
      supabase.from('chat_sessions').update({ profile_id: profile.id, user_nickname: profile.nickname }).eq('id', session.dbSessionId);
    }

    setView('chat');
  };

  const handleStartChat = (menuId?: number) => {
    if (!userProfile && !localStorage.getItem('howl_profile_id')) {
      setView('auth');
    } else {
      setView('chat');
      if (menuId !== undefined) {
        const menu = MENUS.find(m => m.id === menuId);
        if (menu) {
          setTimeout(() => handleMenuSelect(menu), 500);
        }
      }
    }
  };

  if (view === 'landing') {
    return (
      <>
        <LandingPage
          onStartChat={handleStartChat}
          couponActive={couponActive}
          userCredits={userProfile?.credits || 0}
          userName={userProfile?.nickname || ''}
          onCheckCredits={() => {
            if (!userProfile) {
              setView('auth');
            } else {
              toast.info(`현재 적립금: ${userProfile.credits.toLocaleString()}원`);
            }
          }}
        />
        <button
          onClick={() => navigate('/admin/settings')}
          className="fixed top-3 right-3 z-[60] p-2 rounded-full glass hover:bg-muted/60 transition-colors opacity-20 hover:opacity-100"
          title="관리자 설정"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </>
    );
  }

  if (view === 'auth') {
    return (
      <div className="min-h-svh aurora-bg">
        <PhoneAuth
          onAuth={handleAuthComplete}
          onSkip={() => setView('chat')}
        />
      </div>
    );
  }

  const currentCounselor = session.selectedMenu ? getCounselorForMenu(session.selectedMenu.id) : null;

  return (
    <div className="min-h-svh aurora-bg">
      <ChatHeader
        sessionTime={sessionTime}
        counselorName={currentCounselor?.name}
        counselorImage={currentCounselor?.image}
        onBack={() => setView('landing')}
        onExit={() => setShowExitModal(true)}
      />

      {/* Exit Chat Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowExitModal(false)} />
          <div className="relative glass-strong rounded-3xl p-6 max-w-sm w-full shadow-2xl glow-border text-center">
            <h3 className="font-display text-lg font-bold text-foreground mb-3">상담을 종료할까요?</h3>
            <p className="text-sm text-muted-foreground mb-6">대화 내용을 어떻게 할까요?</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleExitChat(false)}
                className="flex-1 py-2.5 rounded-2xl glass text-sm font-semibold hover:bg-muted/40 transition-colors"
              >
                이어하기
              </button>
              <button
                onClick={() => handleExitChat(true)}
                className="flex-1 py-2.5 rounded-2xl bg-destructive/20 text-destructive text-sm font-semibold hover:bg-destructive/30 transition-colors"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {session.isPaid && (sessionTime !== null || timerExpired) && (
        <ConsultTimer
          seconds={sessionTime || 0}
          expired={timerExpired}
          onExtend={() => {
            if (settings.betaMode) {
              setShowBetaModal(true);
            } else {
              setShowPayment(true);
            }
          }}
        />
      )}

      <main className="pt-20 pb-36 px-4 max-w-2xl mx-auto space-y-4">
        {showScan && (
          <ScanAnimation image={showScan} onComplete={handleScanComplete} />
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              counselorImage={currentCounselor?.image}
            />
          ))}
        </AnimatePresence>
        {isTyping && <TypingIndicator />}
        <div ref={chatEndRef} />
      </main>

      <ChatInput
        onSend={handleSend}
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        disabled={isTyping || timerExpired}
        placeholder={
          timerExpired ? '상담 시간이 종료되었습니다'
          : !session.userName && !userProfile?.nickname ? '호칭을 입력해줘...'
          : '메시지 보내기...'
        }
      />

      {session.freeReadingDone && !session.isPaid && session.selectedMenu && (
        <div className="fixed bottom-[120px] w-full px-4 z-40">
          <div className="max-w-2xl mx-auto">
            {settings.betaMode ? (
              <button
                onClick={handleBetaBypass}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg glow-border-hover transition-all active:scale-[0.98] animate-pulse"
              >
                🎉 오픈 기념! 무료로 이어서 상담하기
              </button>
            ) : (
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
                💎 결제하고 계속보기 ({getDbPrice(session.selectedMenu.id).toLocaleString()}원)
              </button>
            )}
          </div>
        </div>
      )}

      {showBetaModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowBetaModal(false)} />
          <div className="relative glass-strong rounded-3xl p-6 max-w-sm w-full shadow-2xl glow-border text-center">
            <span className="text-4xl block mb-3">🎉</span>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">오픈 기념 무료 베타!</h3>
            <p className="text-sm text-muted-foreground mb-4">지금은 무료 베타 테스트 기간입니다</p>
            <button
              onClick={handleBetaBypass}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg glow-border-hover transition-all active:scale-[0.98]"
            >
              무료로 이어서 상담하기 ✨
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
          menu={{ ...session.selectedMenu, price: getDbPrice(session.selectedMenu.id) }}
          userName={session.userName || userProfile?.nickname || ''}
          onClose={() => setShowPayment(false)}
          onPaymentSubmit={handlePaymentSubmit}
          couponActive={couponActive}
          userCredits={userProfile?.credits || 0}
        />
      )}

      {showPremiumForm && (
        <PremiumForm
          userName={session.userName || userProfile?.nickname || ''}
          onSubmit={handlePremiumSubmit}
          onClose={() => setShowPremiumForm(false)}
        />
      )}

      {showReview && userProfile && session.dbSessionId && session.selectedMenu && (
        <ReviewModal
          sessionId={session.dbSessionId}
          profileId={userProfile.id}
          userName={userProfile.nickname}
          menuName={session.selectedMenu.name}
          paymentPrice={getDbPrice(session.selectedMenu.id)}
          onClose={() => setShowReview(false)}
        />
      )}

      <button
        onClick={() => navigate('/admin/settings')}
        className="fixed top-3 right-3 z-[60] p-2 rounded-full glass hover:bg-muted/60 transition-colors opacity-20 hover:opacity-100"
        title="관리자 설정"
      >
        <Settings className="w-4 h-4 text-muted-foreground" />
      </button>

      <div className="fixed bottom-0 w-full text-center pb-1 z-30 pointer-events-none">
        <p className="text-[8px] text-muted-foreground/60 max-w-2xl mx-auto px-4">
          본 서비스는 데이터 분석을 기반으로 한 인사이트 에듀테인먼트 콘텐츠이며, 상담 결과는 자기 탐색을 위한 참고 자료일 뿐 법적 책임을 보장하지 않습니다.
        </p>
      </div>
    </div>
  );
}
