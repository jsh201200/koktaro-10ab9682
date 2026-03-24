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
import PremiumReport from '@/components/PremiumReport';
import ScanAnimation from '@/components/ScanAnimation';
import { useChat } from '@/hooks/useChat';
import { Menu, MENU_WELCOME_GUIDES, MENUS } from '@/data/menus';
import { COUNSELORS, getCounselorForMenu } from '@/data/counselors';
import { getGeminiResponse } from '@/lib/gemini';
import { sendDiscordAlert } from '@/lib/discord';
import { useSiteSettings, loadSettings } from '@/stores/siteSettings';
import { supabase } from '@/integrations/supabase/client';
import { Settings } from 'lucide-react';
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

interface CouponData {
  couponCode: string;
  couponDiscount: number;
  couponActive: boolean;
}

interface DbProduct {
  id: string;
  menu_id: number;
  name: string;
  icon: string;
  price: number;
  duration_minutes: number;
  enabled: boolean;
  sort_order: number;
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
  const [showPremiumReport, setShowPremiumReport] = useState(false);
  const [showScan, setShowScan] = useState<string | null>(null);
  const [sessionTime, setSessionTime] = useState<number | null>(null);
  const [timerExpired, setTimerExpired] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dbProducts, setDbProducts] = useState<DbProduct[]>([]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [couponData, setCouponData] = useState<CouponData>({
    couponCode: '',
    couponDiscount: 0,
    couponActive: false,
  });
  
  // 🧪 테스트 모드 실시간 상태
  const [testMode, setTestMode] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const greetingSent = useRef(false);
  const sessionIdRef = useRef<string>(localStorage.getItem('howl_session_id') || `session_${Date.now()}_${Math.random()}`);

  // 🔐 세션 검증 및 초기화
  useEffect(() => {
    const validateSession = async () => {
      const storedSessionId = localStorage.getItem('howl_session_id');
      const storedProfileId = localStorage.getItem('howl_profile_id');
      const lastAuthId = localStorage.getItem('howl_last_auth_id');
      
      if (!storedSessionId) {
        const newSessionId = `session_${Date.now()}_${Math.random()}`;
        localStorage.setItem('howl_session_id', newSessionId);
        sessionIdRef.current = newSessionId;
        resetSession();
        return;
      }

      if (lastAuthId && storedProfileId && lastAuthId !== storedProfileId) {
        const newSessionId = `session_${Date.now()}_${Math.random()}`;
        localStorage.setItem('howl_session_id', newSessionId);
        localStorage.removeItem('howl_profile_id');
        localStorage.removeItem('howl_last_auth_id');
        sessionIdRef.current = newSessionId;
        resetSession();
        setUserProfile(null);
        setView('landing');
        toast.info('세션이 초기화되었습니다. 다시 시작해주세요.');
        return;
      }

      if (storedProfileId) {
        const { data } = await supabase.from('user_profiles').select('*').eq('id', storedProfileId).single();
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
      }
    };

    validateSession();
  }, []);

  // 🧪 [연동 핵심] testMode 실시간 구독 및 데이터 동기화
  useEffect(() => {
    const fetchTestMode = async () => {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'testMode').single();
      if (data && data.value !== null) {
        // 객체 형태든 불리언 형태든 정확히 판단
        const isTest = typeof data.value === 'object' ? !!data.value.testMode : (data.value === true || data.value === 'true');
        setTestMode(isTest);
      }
    };

    fetchTestMode();

    const channel = supabase
      .channel('test-mode-updates-final')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'site_settings', 
        filter: `key=eq.testMode` 
      }, (payload) => {
        const newVal = payload.new ? payload.new.value : null;
        if (newVal !== null) {
          const isTest = typeof newVal === 'object' ? !!newVal.testMode : (newVal === true || newVal === 'true');
          setTestMode(isTest);
          console.log('✅ 테스트 모드 상태 동기화됨:', isTest);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      const { data } = await supabase.from('products').select('*').eq('enabled', true).order('sort_order');
      if (data) setDbProducts(data as DbProduct[]);
    };
    loadProducts();
  }, []);

  useEffect(() => {
    const fetchCoupon = async () => {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'coupon').single();
      if (data && data.value) setCouponData(data.value as CouponData);
    };
    fetchCoupon();

    const channel = supabase.channel('coupon-updates').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings', filter: `key=eq.coupon` }, (payload) => {
      if (payload.new && payload.new.value) setCouponData(payload.new.value as CouponData);
    }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getIcebreakerMessage = useCallback((counselorId: string, userName: string) => {
    const hour = new Date().getHours();
    let timeGreeting = hour < 9 ? '새벽부터 고민이 깊으신가 봐요' : hour < 12 ? '오전이 반짝반짝한 시간이네요' : hour < 18 ? '오후의 햇살이 운명을 밝혀줄 거예요' : hour < 22 ? '저녁 별들이 당신의 이야기를 듣고 싶어해요' : '밤은 진실이 드러나는 시간이에요';
    const tones: any = { 'ian': `${timeGreeting}... 자산과 운명을 동시에 챙겨야 하는 시간이네요. 💼`, 'jihan': `${timeGreeting}! 오늘따라 운이 어떨까? 함께 봐봐! 😎`, 'songsengsang': `${timeGreeting}. 이 시간의 기운을 함께 읽어보겠습니다. ✨`, 'luna': `${timeGreeting}... 별들과 당신의 에너지가 공명하고 있어요. 🌙`, 'suhyun': `${timeGreeting}... 당신의 마음이 저한테 들려요. 🫂`, 'myunghwa': `${timeGreeting}. 자, 솔직하게 봐보자! 🔥` };
    return tones[counselorId] || timeGreeting;
  }, []);

  useEffect(() => {
    if (view === 'chat' && !greetingSent.current && messages.length === 0) {
      greetingSent.current = true;
      const name = userProfile?.nickname || session.userName;
      setTimeout(() => {
        if (name && session.selectedMenu) {
          const counselor = getCounselorForMenu(session.selectedMenu.id);
          addBotMessage(`${name}님 ✨\n\n${getIcebreakerMessage(counselor.id, name)}\n\n오늘은 어떤 운명을 들어보고 싶으신가요?`);
        } else if (name) {
          addBotMessage(`${name}! 좋은 호칭이야 ✨\n\n어떤 운명의 문을 열어볼까?\n아래 '메뉴 보기' 버튼을 눌러 상담 메뉴를 확인해줘! 🔮`);
        } else { addBotMessage(settings.welcomeMessage); }
      }, 500);
    }
  }, [view, messages.length, session.selectedMenu]);

  useEffect(() => {
    if (session.sessionExpiry && session.isPaid) {
      setTimerExpired(false);
      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.floor((session.sessionExpiry! - Date.now()) / 1000));
        setSessionTime(remaining);
        if (remaining === 300) addSystemMessage("기운이 다해가고 있어! 5분 뒤면 상담이 종료되니 서둘러줘! ✨");
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
    const channel = supabase.channel('payment-approval').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments', filter: `session_id=eq.${session.dbSessionId}` }, (payload) => {
      const updated = payload.new as any;
      if (updated.status === 'approved') {
        const product = dbProducts.find(p => p.menu_id === updated.menu_id);
        activatePaidMode(product?.duration_minutes || 30, updated.menu_id, updated.menu_name, updated.price);
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session.dbSessionId, dbProducts]);

  const activatePaidMode = useCallback((durationMin: number, menuId: number, menuName: string, price: number) => {
    updateSession({ isPaid: true, sessionExpiry: menuId === 0 ? null : Date.now() + durationMin * 60 * 1000, maxQuestions: menuId === 16 ? 3 : 1, questionCount: 0, paymentPending: false });
    setTimerExpired(false);
    addSystemMessage("💜 결제가 승인되었습니다!");
    toast.success("입금 확인 완료! ✨");
    setTimeout(() => {
      const welcomeGuide = MENU_WELCOME_GUIDES[menuId];
      const name = session.userName || userProfile?.nickname || '';
      addBotMessage(welcomeGuide || `${name}님, 결제가 확인됐어! 이제 상담을 시작할게 ✨`);
    }, 800);
  }, [session.userName, userProfile?.nickname]);

  const delayedTyping = useCallback((): Promise<void> => new Promise(resolve => setTimeout(resolve, TYPING_DELAY_MS)), []);

  const getDbPrice = (menuId: number): number => dbProducts.find(p => p.menu_id === menuId)?.price || 0;

  const handleBotResponse = useCallback(async (userInput: string, menuName?: string, isPaid?: boolean, imageBase64?: string, counselorId?: string, menuPrice?: number) => {
    setIsTyping(true);
    try {
      await delayedTyping();
      const history = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'bot' | 'user', content: m.content }));
      const response = await getGeminiResponse(userInput, history, menuName, isPaid, imageBase64, counselorId, menuPrice);
      addBotMessage(response);
    } catch { addBotMessage('기운이 잠시 흔들렸어... 다시 물어봐줘! ✨'); }
    finally { setIsTyping(false); }
  }, [messages]);

  const handleSend = async (text: string, image?: string) => {
    addUserMessage(text, image);
    if (session.isPaid && session.selectedMenu && session.selectedMenu.id === 0) {
      addBotMessage("오늘의 기운을 모두 읽어드렸어요! ✨");
      updateSession({ isPaid: false, selectedMenu: null, freeReadingDone: false, questionCount: 0, sessionExpiry: null });
      setShowReview(true);
      return;
    }
    if (session.isPaid && session.selectedMenu) {
      if (session.questionCount >= session.maxQuestions + 1) {
        addBotMessage("이번 상담 기운은 여기까지야! 메뉴에서 새로 골라줘! 🌟");
        updateSession({ isPaid: false, selectedMenu: null, freeReadingDone: false, questionCount: 0, sessionExpiry: null });
        setShowReview(true);
        return;
      }
      updateSession({ questionCount: session.questionCount + 1 });
      const counselor = getCounselorForMenu(session.selectedMenu.id);
      await handleBotResponse(text, session.selectedMenu.name, true, image, counselor.id, getDbPrice(session.selectedMenu.id));
      return;
    }
    if (!session.userName && !userProfile?.nickname) {
      const name = text.trim().replace(/[^\uac00-\ud7a3a-zA-Z0-9\s]/g, '').trim();
      if (name) { updateSession({ userName: name }); addBotMessage(`${name}! 좋은 호칭이야 ✨ 메뉴를 골라줘!`); return; }
    }
    const counselor = session.selectedMenu ? getCounselorForMenu(session.selectedMenu.id) : undefined;
    await handleBotResponse(text, session.selectedMenu?.name, session.isPaid, image, counselor?.id);
  };

  const handleMenuSelect = async (menu: Menu) => {
    setIsMenuOpen(false);
    const counselor = getCounselorForMenu(menu.id);
    const dbProduct = dbProducts.find(p => p.menu_id === menu.id);
    const actualMenu = dbProduct ? { ...menu, price: dbProduct.price, name: dbProduct.name } : menu;
    updateSession({ selectedMenu: actualMenu, freeReadingDone: false, questionCount: 0, userName: session.userName || userProfile?.nickname || '', counselorId: counselor.id });

    // ✨ 실시간 동기화된 testMode 확인
    if (testMode) {
      activatePaidMode(30, menu.id, actualMenu.name, actualMenu.price);
      addSystemMessage('🧪 테스트 모드: 결제 없이 시작합니다.');
      return;
    }
    if (menu.id === 16) { setShowPremiumForm(true); return; }
    setShowPayment(true);
  };

  const handleScanComplete = async () => {
    const image = showScan; setShowScan(null); if (!image) return;
    const counselor = session.selectedMenu ? getCounselorForMenu(session.selectedMenu.id) : undefined;
    await handleBotResponse('사진을 분석해줘', session.selectedMenu?.name, session.isPaid, image, counselor?.id, session.selectedMenu ? getDbPrice(session.selectedMenu.id) : undefined);
  };

  const handleExitChat = async (deleteChat: boolean) => {
    setShowExitModal(false);
    if (deleteChat) await supabase.from('messages').delete().eq('session_id', session.dbSessionId);
    resetSession(); setView('landing'); setUserProfile(null);
  };

  const handlePaymentSubmit = async (method: any, depositor: string, phoneTail: string) => {
    setShowPayment(false);
    await supabase.from('payments').insert({ session_id: session.dbSessionId, user_nickname: session.userName || userProfile?.nickname || '', menu_name: session.selectedMenu?.name, menu_id: session.selectedMenu?.id, price: getDbPrice(session.selectedMenu!.id), method, depositor, phone_tail: phoneTail, status: 'pending' });
    updateSession({ paymentPending: true });
    addBotMessage(`입금 확인 요청을 보냈어! 확인되면 상담을 시작할게 ✨`);
  };

  const handleAuthComplete = (profile: UserProfile) => {
    setUserProfile(profile); updateSession({ userName: profile.nickname }); setView('chat');
  };

  const handleStartChat = (menuId?: number) => {
    if (!userProfile && !localStorage.getItem('howl_profile_id')) setView('auth');
    else { setView('chat'); if (menuId !== undefined) { const m = MENUS.find(x => x.id === menuId); if (m) setTimeout(() => handleMenuSelect(m), 500); } }
  };

  if (view === 'landing') return (
    <>
      <LandingPage onStartChat={handleStartChat} couponActive={couponData.couponActive} userCredits={userProfile?.credits || 0} userName={userProfile?.nickname || ''} onCheckCredits={() => {}} />
      <button onClick={() => navigate('/admin')} className="fixed top-3 right-3 z-[60] p-2 rounded-full glass hover:bg-muted/60 transition-colors"><Settings className="w-4 h-4 text-muted-foreground" /></button>
    </>
  );

  if (view === 'auth') return <div className="min-h-svh aurora-bg"><PhoneAuth onAuth={handleAuthComplete} onSkip={() => setView('chat')} /></div>;

  const currentCounselor = session.selectedMenu ? getCounselorForMenu(session.selectedMenu.id) : session.counselorId ? COUNSELORS.find(c => c.id === session.counselorId) || null : null;

  return (
    <div className="min-h-svh aurora-bg">
      <ChatHeader sessionTime={sessionTime} counselorName={currentCounselor?.name} counselorImage={currentCounselor?.image} onBack={() => setView('landing')} onExit={() => setShowExitModal(true)} />
      
      {showExitModal && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowExitModal(false)} />
          <div className="relative glass-strong rounded-3xl p-6 max-w-sm w-full text-center">
            <h3 className="font-display text-lg font-bold mb-3">상담을 종료할까요?</h3>
            <div className="flex gap-3">
              <button onClick={() => handleExitChat(false)} className="flex-1 py-2.5 rounded-2xl glass text-sm">이어하기</button>
              <button onClick={() => handleExitChat(true)} className="flex-1 py-2.5 rounded-2xl bg-destructive/20 text-destructive text-sm">삭제하기</button>
            </div>
          </div>
        </div>
      )}

      <main className="pt-20 pb-36 px-4 max-w-2xl mx-auto space-y-4">
        {showScan && <ScanAnimation image={showScan} onComplete={handleScanComplete} />}
        <AnimatePresence initial={false}>{messages.map((msg) => <MessageBubble key={msg.id} message={msg} counselorImage={currentCounselor?.image} />)}</AnimatePresence>
        {isTyping && <TypingIndicator counselorImage={currentCounselor?.image} />}
        <div ref={chatEndRef} />
      </main>

      <ChatInput onSend={handleSend} onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} disabled={isTyping || timerExpired} placeholder="메시지 보내기..." />
      
      {session.freeReadingDone && !session.isPaid && session.selectedMenu && (
        <div className="fixed bottom-[120px] w-full px-4 z-40">
          <div className="max-w-2xl mx-auto"><button onClick={() => setShowPayment(true)} className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg animate-pulse">💎 결제하고 계속보기 ({getDbPrice(session.selectedMenu.id).toLocaleString()}원)</button></div>
        </div>
      )}

      <AnimatePresence>{isMenuOpen && <MenuGrid onSelect={handleMenuSelect} onClose={() => setIsMenuOpen(false)} />}</AnimatePresence>
      {showPayment && session.selectedMenu && <PaymentModal menu={{...session.selectedMenu, price: getDbPrice(session.selectedMenu.id)}} userName={session.userName || userProfile?.nickname || ''} onClose={() => setShowPayment(false)} onPaymentSubmit={handlePaymentSubmit} couponActive={couponData.couponActive} couponCode={couponData.couponCode} couponDiscount={couponData.couponDiscount} userCredits={userProfile?.credits || 0} />}
      {showPremiumForm && <PremiumForm userName={session.userName || userProfile?.nickname || ''} onSubmit={() => {}} onClose={() => setShowPremiumForm(false)} />}
      {showReview && userProfile && session.dbSessionId && session.selectedMenu && <ReviewModal sessionId={session.dbSessionId} profileId={userProfile.id} userName={userProfile.nickname} menuName={session.selectedMenu.name} paymentPrice={getDbPrice(session.selectedMenu.id)} onClose={() => { setShowReview(false); setShowPremiumReport(true); }} />}
      {showPremiumReport && <PremiumReport counselorName={currentCounselor?.name || ''} menuName={session.selectedMenu?.name || ''} userName={userProfile?.nickname || ''} chatMessages={messages} onClose={() => setShowPremiumReport(false)} />}

      {/* ⚙️ 톱니바퀴 버튼 (랜딩/채팅 모두 우측 상단 고정) */}
      <button onClick={() => navigate('/admin')} className="fixed top-3 right-3 z-[60] p-2 rounded-full glass hover:bg-muted/60 transition-colors shadow-lg"><Settings className="w-4 h-4 text-muted-foreground" /></button>
    </div>
  );
}
