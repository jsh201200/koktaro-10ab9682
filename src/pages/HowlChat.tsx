import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import TimeSelectionModal from '@/components/TimeSelectionModal';
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

interface UserProfile { id: string; phone: string; nickname: string; credits: number; birth_date?: string; birth_time?: string; gender?: string; }
interface CouponData { couponCode: string; couponDiscount: number; couponActive: boolean; }
interface DbProduct { id: string; menu_id: number; name: string; icon: string; price: number; duration_minutes: number; enabled: boolean; sort_order: number; }

const generateAdviceMessages = (): string[] => [
  "지금의 침체가 영원하지 않아요. 다음 달쯤이면 새로운 기회의 문이 열릴 거야. 그때를 대비해서 지금 하나씩 준비하는 게 가장 현명한 태도야.",
  "주변의 목소리에 흔들리지 말고 자신의 직관을 믿어봐. 너는 이미 답을 알고 있어. 지금 필요한 건 자신에 대한 신뢰야.",
  "더 이상 같은 실수를 반복하지 말고 이번엔 다른 방식으로 접근해봐. 과거를 바꿀 순 없지만 미래는 얼마든지 다르게 만들 수 있어.",
  "지금이 가장 힘든 시간일 수도 있지만, 이 경험이 나중에 가장 큰 자산이 될 거야. 어려움을 견디는 과정이 성장이거든.",
  "혼자라고 느껴지겠지만 넌 혼자가 아니야. 너를 응원하는 사람들이 있고, 어떤 상황에서든 너는 충분하다는 걸 잊지 마.",
  "지금 주어진 기회를 놓치지 말아. 완벽하지 않아도 괜찮아. 시작하는 것 자체가 이미 반 이상을 온 거니까.",
  "너의 약점이라고 생각하는 게 사실은 너의 가장 큰 강점일 수도 있어. 남과 다르다고 해서 모자란 게 아니야.",
  "계획만 세우고 실행하지 않으면 아무것도 바뀌지 않아. 지금 당장 할 수 있는 작은 것부터 시작해봐.",
  "이 고민도 시간이 지나면 웃으면서 이야기할 날이 올 거야. 현재의 고통이 미래의 지혜로 변할 거니까.",
  "남의 성공과 너를 비교하지 말아. 각자의 타이밍이 다르고 각자의 길이 다르거든. 너는 너의 속도로 충분해."
];
const generateColors = (): string[] => ["보라색", "파란색", "녹색", "주황색", "분홍색", "노란색", "빨간색", "수색", "민트색", "자주색"];
const generateNumbers = (): number[] => [7, 3, 9, 5, 2, 8, 1, 6, 4, 11, 13, 17, 21, 27, 33];

export default function HowlChat() {
  const { messages, session, isTyping, setIsTyping, addBotMessage, addUserMessage, addSystemMessage, updateSession, resetSession } = useChat();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  
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
  const [couponData, setCouponData] = useState<CouponData>({ couponCode: '', couponDiscount: 0, couponActive: false });
  const [showTimeSelection, setShowTimeSelection] = useState(false);
  const [selectedMenuForTime, setSelectedMenuForTime] = useState<DbProduct | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const greetingSent = useRef(false);
  const sessionIdRef = useRef<string>(localStorage.getItem('howl_session_id') || `session_${Date.now()}_${Math.random()}`);

  // 🔐 [1] 세션 및 데이터 로드
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
        toast.info('세션이 초기화되었습니다.');
        return;
      }
      if (storedProfileId) {
        const { data } = await supabase.from('user_profiles').select('*').eq('id', storedProfileId).single();
        if (data) setUserProfile({ id: data.id, phone: data.phone, nickname: data.nickname || '', credits: data.credits || 0 });
      }
    };
    validateSession();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      const { data } = await supabase.from('products').select('*').eq('enabled', true).order('sort_order');
      if (data) setDbProducts(data);
    };
    loadProducts();
  }, []);

  // ✨ [2] 결제 승인 활성화 함수 (최신 버전)
  const activatePaidMode = useCallback((durationMin: number, menuId: number, menuName: string, price: number) => {
    console.log('🎯 activatePaidMode 호출:', { menuId, menuName, price, durationMin });

    if (menuId === 0) {
      updateSession({ isPaid: true, sessionExpiry: null, maxQuestions: 0, questionCount: 0, paymentPending: false });
      setTimerExpired(false);
      addSystemMessage("💜 결제가 승인되었습니다!");
      toast.success("입금 확인 완료! ✨");

      const advice = generateAdviceMessages()[Math.floor(Math.random() * 10)];
      const color = generateColors()[Math.floor(Math.random() * 10)];
      const number = generateNumbers()[Math.floor(Math.random() * 15)];

      setTimeout(() => {
        addBotMessage(`✨ 오늘의 조언:\n\n${advice}\n\n🎨 럭키 컬러: ${color}\n🔢 행운의 숫자: ${number}`);
      }, 500);

      setTimeout(() => {
        addBotMessage("오늘의 기운을 모두 읽어드렸어요! 내일도 좋은 하루 되세요 ✨");
        updateSession({ isPaid: false, selectedMenu: null, freeReadingDone: false, questionCount: 0, sessionExpiry: null });
        setSessionTime(null);
        setShowReview(true);
      }, 3000);
      return;
    }

    // 타로 1Q 전용
    if ([36, 37, 38, 39].includes(menuId)) {
      updateSession({ isPaid: true, sessionExpiry: null, maxQuestions: 1, questionCount: 0, paymentPending: false });
      setTimerExpired(false);
      addSystemMessage("💜 결제가 승인되었습니다!");
      toast.success("입금 확인 완료! ✨");
      setTimeout(() => { addBotMessage(`✨ 타로 카드 리딩이 시작됐어요!\n\n궁금한 질문을 하나 해주세요 🔮`); }, 500);
      return;
    }

    // 일반 심층 상담
    updateSession({ isPaid: true, sessionExpiry: Date.now() + durationMin * 60 * 1000, maxQuestions: menuId === 16 ? 3 : 1, questionCount: 0, paymentPending: false });
    setTimerExpired(false);
    addSystemMessage("💜 결제가 승인되었습니다! 심층 리딩을 시작합니다.");
    toast.success("입금 확인 완료! ✨");

    setTimeout(() => {
      const welcomeGuide = MENU_WELCOME_GUIDES[menuId];
      const name = session.userName || userProfile?.nickname || '';
      addBotMessage(welcomeGuide || `${name}님, 결제가 확인됐어! 이제 심층 리딩을 시작할게 ✨ 궁금한 것을 말씀해주세요!`);
    }, 800);
  }, [updateSession, addSystemMessage, addBotMessage, session.userName, userProfile?.nickname]);

  // ✨ [3] 실시간 결제 감지 구독 (고유 채널 방식)
  useEffect(() => {
    if (!session.dbSessionId) return;

    console.log('🔔 결제 구독 채널 생성:', session.dbSessionId);
    const channel = supabase
      .channel(`payment-approval-${session.dbSessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments', filter: `session_id=eq.${session.dbSessionId}` }, 
      async (payload) => {
        const updated = payload.new as any;
        if (updated.status === 'approved') {
          const product = dbProducts.find(p => p.menu_id === updated.menu_id);
          if (product) {
            activatePaidMode(product.duration_minutes || 30, updated.menu_id, updated.menu_name || product.name, updated.final_price || updated.price);
          }
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session.dbSessionId, dbProducts, activatePaidMode]);

  // ✨ [4] 상담사 프로필 이미지 로직 (히포 이미지 등 노출용)
  const currentCounselor = session.selectedMenu
    ? getCounselorForMenu(session.selectedMenu.id)
    : session.counselorId
      ? COUNSELORS.find(c => c.id === session.counselorId) || null
      : null;

  // 🔐 나머지 핸들러 함수들
  const getIcebreakerMessage = useCallback((counselorId: string) => {
    const hour = new Date().getHours();
    let timeGreeting = hour < 9 ? '새벽부터 고민이 깊으시네요' : hour < 12 ? '오전이 반짝이는 시간이네요' : hour < 18 ? '오후의 햇살이 밝혀줄 거예요' : '밤은 진실이 드러나는 시간이에요';
    const tones: { [key: string]: string } = { 'ian': `${timeGreeting}... 💼`, 'jihan': `${timeGreeting}! 😎`, 'songsengsang': `${timeGreeting}. ✨`, 'luna': `${timeGreeting}... 🌙`, 'suhyun': `${timeGreeting}... 🫂`, 'myunghwa': `${timeGreeting}. 🔥` };
    return tones[counselorId] || timeGreeting;
  }, []);

  useEffect(() => {
    if (view === 'chat' && !greetingSent.current && messages.length === 0) {
      greetingSent.current = true;
      const name = userProfile?.nickname || session.userName;
      setTimeout(() => {
        if (name && session.selectedMenu) {
          const counselor = getCounselorForMenu(session.selectedMenu.id);
          addBotMessage(`${name}님 ✨\n\n${getIcebreakerMessage(counselor.id)}\n\n오늘은 어떤 운명을 들어보고 싶으신가요?`);
        } else if (name) {
          addBotMessage(`${name}! 좋은 호칭이야 ✨\n\n어떤 운명의 문을 열어볼까?\n아래 '메뉴 보기' 버튼을 눌러 상담 메뉴를 확인해줘! 🔮`);
        }
      }, 500);
    }
  }, [view, messages.length, session.selectedMenu, userProfile?.nickname, session.userName]);

  const handleSend = async (text: string, image?: string) => {
    addUserMessage(text, image);
    if (session.isPaid && session.selectedMenu) {
      if (session.questionCount >= session.maxQuestions + 1) {
        addBotMessage("이번 고민에 대한 기운은 여기까지야! 다른 상담사도 만나볼래? 🌟");
        setTimeout(() => setIsMenuOpen(true), 1500);
        updateSession({ isPaid: false, selectedMenu: null, questionCount: 0 });
        setShowReview(true);
        return;
      }
      updateSession({ questionCount: session.questionCount + 1 });
      const counselor = getCounselorForMenu(session.selectedMenu.id);
      setIsTyping(true);
      const response = await getGeminiResponse(text, messages.map(m => ({ role: m.role as any, content: m.content })), session.selectedMenu.name, true, image, counselor.id);
      addBotMessage(response);
      setIsTyping(false);
    } else if (!session.userName && !userProfile?.nickname) {
      const name = text.trim();
      if (name) {
        updateSession({ userName: name });
        addBotMessage(`${name}! 좋은 호칭이야 ✨\n\n아래 '메뉴 보기' 버튼을 눌러 상담 메뉴를 확인해줘! 🔮`);
      }
    } else {
      setIsTyping(true);
      const response = await getGeminiResponse(text, messages.map(m => ({ role: m.role as any, content: m.content })));
      addBotMessage(response);
      setIsTyping(false);
    }
  };

  const handleMenuSelect = async (menu: Menu) => {
    setIsMenuOpen(false);
    const counselor = getCounselorForMenu(menu.id);
    const dbProduct = dbProducts.find(p => p.menu_id === menu.id);
    const actualMenu = dbProduct ? { ...menu, price: dbProduct.price, name: dbProduct.name } : menu;
    updateSession({ selectedMenu: actualMenu, userName: session.userName || userProfile?.nickname || '', counselorId: counselor.id });
    setShowPayment(true);
  };

  const handlePaymentSubmit = async (method: 'kakaopay' | 'bank', depositor: string, phoneTail: string) => {
    const menu = session.selectedMenu!;
    setShowPayment(false);
    const dbPrice = dbProducts.find(p => p.menu_id === menu.id)?.price || 0;
    await supabase.from('payments').insert({
      session_id: session.dbSessionId, user_nickname: session.userName || userProfile?.nickname || '',
      menu_name: menu.name, menu_id: menu.id, price: dbPrice, method, depositor, phone_tail: phoneTail, status: 'pending'
    });
    updateSession({ paymentPending: true });
    addBotMessage(`결제 확인 요청을 보냈어! 관리자가 확인하면 상담을 시작할게 ✨`);
  };

  const handleStartChat = (menuId?: number) => {
    if (!userProfile && !localStorage.getItem('howl_profile_id')) setView('auth');
    else {
      setView('chat');
      if (menuId) {
        const menu = MENUS.find(m => m.id === menuId);
        if (menu) setTimeout(() => handleMenuSelect(menu), 500);
      }
    }
  };

  // 🎨 [렌더링 부분]
  if (view === 'landing') return <LandingPage onStartChat={handleStartChat} userName={userProfile?.nickname || ''} userCredits={userProfile?.credits || 0} />;
  if (view === 'auth') return <PhoneAuth onAuth={(p) => { setUserProfile(p); setView('chat'); }} onSkip={() => setView('chat')} />;

  return (
    <div className="min-h-svh aurora-bg">
      <ChatHeader sessionTime={sessionTime} counselorName={currentCounselor?.name} counselorImage={currentCounselor?.image} onBack={() => setView('landing')} onExit={() => setShowExitModal(true)} />
      
      <main className="pt-20 pb-36 px-4 max-w-2xl mx-auto space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} counselorImage={currentCounselor?.image} />
          ))}
        </AnimatePresence>
        {isTyping && <TypingIndicator counselorImage={currentCounselor?.image} />}
        <div ref={chatEndRef} />
      </main>

      <ChatInput onSend={handleSend} onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} disabled={isTyping || timerExpired} />

      <AnimatePresence>
        {isMenuOpen && <MenuGrid onSelect={handleMenuSelect} onClose={() => setIsMenuOpen(false)} counselorId={currentCounselor?.id} />}
      </AnimatePresence>

      {showPayment && session.selectedMenu && (
        <PaymentModal menu={{ ...session.selectedMenu, price: dbProducts.find(p => p.menu_id === session.selectedMenu?.id)?.price || 0 }} userName={session.userName || userProfile?.nickname || ''} onClose={() => setShowPayment(false)} onPaymentSubmit={handlePaymentSubmit} userCredits={userProfile?.credits || 0} />
      )}
      
      {/* 관리자 버튼 생략 가능 */}
      <button onClick={() => navigate('/admin')} className="fixed top-3 right-3 z-[60] p-2 rounded-full glass hover:bg-muted/60 transition-colors"><Settings className="w-4 h-4 text-muted-foreground" /></button>
    </div>
  );
}
