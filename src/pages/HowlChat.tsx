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

// 생략 가능한 인터페이스 및 데이터 생성 함수들 (기존 코드와 동일)
interface UserProfile { id: string; phone: string; nickname: string; credits: number; birth_date?: string; birth_time?: string; gender?: string; }
interface CouponData { couponCode: string; couponDiscount: number; couponActive: boolean; }
interface DbProduct { id: string; menu_id: number; name: string; icon: string; price: number; duration_minutes: number; enabled: boolean; sort_order: number; }

const generateAdviceMessages = (): string[] => [
  "지금의 침체가 영원하지 않아요. 다음 달쯤이면 새로운 기회의 문이 열릴 거야. 그때를 대비해서 지금 하나씩 준비하는 게 가장 현명한 태도야. 작은 행동이 모여 큰 변화를 만들거든.",
  "주변의 목소리에 흔들리지 말고 자신의 직관을 믿어봐. 너는 이미 답을 알고 있어. 지금 필요한 건 다른 사람의 조언이 아니라 자신에 대한 신뢰야. 그 확신을 가지고 한 발 내딛는 것, 그게 전부야.",
  "더 이상 같은 실수를 반복하지 말고 이번엔 다른 방식으로 접근해봐. 과거를 바꿀 순 없지만 미래는 얼마든지 다르게 만들 수 있어. 한 번의 도전이 모든 걸 바꿀 수도 있다는 걸 기억해.",
  "지금이 가장 힘든 시간일 수도 있지만, 이 경험이 나중에 가장 큰 자산이 될 거야. 어려움을 견디는 과정이 성장이거든. 포기하지 말고 한 계단씩 올라가다 보면 분명 좋은 날이 온다고 믿어.",
  "혼자라고 느껴지겠지만 넌 혼자가 아니야. 너를 응원하는 사람들이 있고, 어떤 상황에서든 너는 충분하다는 걸 잊지 말아. 가끔 누군가에게 도움을 청하는 것도 용감한 거야. 너의 가치를 스스로 깎아내리지 마.",
  "지금 주어진 기회를 놓치지 말아. 나중에 '그때 했으면'이 후회로 바뀌기 전에 지금 바로 행동해봐. 완벽하지 않아도 괜찮아. 시작하는 것 자체가 이미 반 이상을 온 거니까. 용기 내서 한 발 내디뎌봐.",
  "너의 약점이라고 생각하는 게 사실은 너의 가장 큰 강점일 수도 있어. 남과 다르다고 해서 모자란 게 아니야. 그 차이가 너를 특별하게 만드는 거야. 자신을 받아들이고 그대로 나아가봐.",
  "계획만 세우고 실행하지 않으면 아무것도 바뀌지 않아. 지금 당장 할 수 있는 작은 것부터 시작해봐. 큰 변화는 작은 행동들의 모임에서 나온다고. 미루지 말고 오늘부터 움직여봐.",
  "이 고민도 시간이 지나면 웃으면서 이야기할 날이 올 거야. 지금은 힘들 수 있지만 모든 일은 그 나름의 의미가 있다고 믿어. 현재의 고통이 미래의 지혜로 변할 거니까. 견뎌내는 것도 큰 힘이야.",
  "남의 성공과 너를 비교하지 말아. 각자의 타이밍이 다르고 각자의 길이 다르거든. 너는 너의 속도로 충분히 잘하고 있어. 자기 인생에만 집중하면 분명 좋은 결과가 따라올 거야.",
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

  // 🔐 [초기화 및 세션 로직 - 기존과 동일]
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
        if (data) setUserProfile({ id: data.id, phone: data.phone, nickname: data.nickname || '', credits: data.credits || 0, birth_date: data.birth_date || undefined, birth_time: data.birth_time || undefined, gender: data.gender || undefined });
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

  // ✨ [최신 결제 승인 로직: activatePaidMode]
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

    if ([36, 37, 38, 39].includes(menuId)) {
      updateSession({ isPaid: true, sessionExpiry: null, maxQuestions: 1, questionCount: 0, paymentPending: false });
      setTimerExpired(false);
      addSystemMessage("💜 결제가 승인되었습니다!");
      toast.success("입금 확인 완료! ✨");
      setTimeout(() => { addBotMessage(`✨ 타로 카드 리딩이 시작됐어요!\n\n궁금한 질문을 하나 해주세요 🔮`); }, 500);
      return;
    }

    updateSession({ isPaid: true, sessionExpiry: Date.now() + durationMin * 60 * 1000, maxQuestions: menuId === 16 ? 3 : 1, questionCount: 0, paymentPending: false });
    setTimerExpired(false);
    addSystemMessage("💜 결제가 승인되었습니다! 심층 리딩을 시작합니다.");
    toast.success("입금 확인 완료! 상담을 이어갑니다 ✨");

    setTimeout(() => {
      const welcomeGuide = MENU_WELCOME_GUIDES[menuId];
      const name = session.userName || userProfile?.nickname || '';
      addBotMessage(welcomeGuide || `${name}님, 결제가 확인됐어! 이제 심층 리딩을 시작할게 ✨ 궁금한 것을 말씀해주세요!`);
    }, 800);
  }, [updateSession, addSystemMessage, addBotMessage, session.userName, userProfile?.nickname]);

  // ✨ [최신 결제 실시간 구독 로직]
  useEffect(() => {
    if (!session.dbSessionId) return;

    console.log('🔔 결제 구독 시작 (채널 고유화):', session.dbSessionId);
    const channel = supabase
      .channel(`payment-approval-${session.dbSessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments', filter: `session_id=eq.${session.dbSessionId}` }, 
      async (payload) => {
        console.log('📢 결제 업데이트 감지:', payload);
        const updated = payload.new as any;
        
        if (updated.status === 'approved') {
          console.log('✅ 승인됨! 데이터 매칭 시작');
          const product = dbProducts.find(p => p.menu_id === updated.menu_id);
          
          if (!product) {
            console.error('❌ 상품 매칭 실패:', updated.menu_id);
            toast.error('상품 정보를 찾을 수 없습니다');
            return;
          }

          activatePaidMode(
            product.duration_minutes || 30,
            updated.menu_id,
            updated.menu_name || product.name,
            updated.final_price || updated.price
          );
        }
      })
      .subscribe((status) => { console.log('구독 상태:', status); });

    return () => { supabase.removeChannel(channel); };
  }, [session.dbSessionId, dbProducts, activatePaidMode]);

  // 🔐 [나머지 핸들러 및 렌더링 - 기존 로직 유지]
  const handleBotResponse = useCallback(async (userInput: string, menuName?: string, isPaid?: boolean, imageBase64?: string, counselorId?: string, menuPrice?: number) => {
    setIsTyping(true);
    try {
      await new Promise(resolve => setTimeout(resolve, TYPING_DELAY_MS));
      const history = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'bot' | 'user', content: m.content }));
      const response = await getGeminiResponse(userInput, history, menuName, isPaid, imageBase64, counselorId, menuPrice);
      addBotMessage(response);
    } catch {
      addBotMessage('기운이 잠시 흔들렸어... 다시 물어봐줘! ✨');
    } finally { setIsTyping(false); }
  }, [messages, addBotMessage, setIsTyping]);

  const handleSend = async (text: string, image?: string) => {
    addUserMessage(text, image);
    if (session.isPaid && session.selectedMenu && session.selectedMenu.id === 0) {
      addBotMessage("오늘의 기운을 모두 읽어드렸어요! 내일도 좋은 하루 되세요 ✨");
      updateSession({ isPaid: false, selectedMenu: null, freeReadingDone: false, questionCount: 0, sessionExpiry: null });
      setSessionTime(null); setShowReview(true);
      return;
    }
    if (session.isPaid && session.selectedMenu) {
      if (session.questionCount >= session.maxQuestions + 1) {
        addBotMessage("이번 고민에 대한 기운은 여기까지야! 더 깊은 상담은 메뉴에서 새로 골라줘! 🌟");
        setTimeout(() => { setIsMenuOpen(true); }, 1500);
        updateSession({ isPaid: false, selectedMenu: null, freeReadingDone: false, questionCount: 0, sessionExpiry: null });
        setSessionTime(null); setShowReview(true);
        return;
      }
      updateSession({ questionCount: session.questionCount + 1 });
      const counselor = getCounselorForMenu(session.selectedMenu.id);
      await handleBotResponse(text, session.selectedMenu.name, true, image, counselor.id, getDbPrice(session.selectedMenu.id));
      return;
    }
    // [이후 생략: 기존 handleSend 미결제 로직 동일]
  };

  const handlePaymentSubmit = async (method: 'kakaopay' | 'bank', depositor: string, phoneTail: string) => {
    const menu = session.selectedMenu!;
    setShowPayment(false);
    const dbPrice = getDbPrice(menu.id);
    let discountAmount = 0;
    let finalPrice = dbPrice;
    if (couponData.couponActive && couponData.couponCode && dbPrice >= 9900) {
      discountAmount = couponData.couponDiscount;
      finalPrice = Math.max(0, dbPrice - discountAmount);
    }

    console.log('💳 결제 요청 저장:', { session_id: session.dbSessionId, menu_id: menu.id, final_price: finalPrice });
    await supabase.from('payments').insert({
      session_id: session.dbSessionId, user_nickname: session.userName || userProfile?.nickname || '',
      menu_name: menu.name, menu_id: menu.id, price: dbPrice, method, depositor, phone_tail: phoneTail,
      chat_log: messages.map(m => `[${m.role}] ${m.content}`), status: 'pending',
      discount_amount: discountAmount, final_price: finalPrice
    });

    updateSession({ paymentPending: true });
    sendDiscordAlert({ userName: session.userName || userProfile?.nickname || '', menuName: menu.name, menuId: menu.id, price: finalPrice, method, depositor, phoneTail });

    if (method === 'kakaopay') {
      addSystemMessage('카카오페이 결제 요청이 전송되었습니다');
      addBotMessage(`카카오페이 결제 링크가 열렸어! 관리자가 확인 중이니 잠시만 기다려줘 ✨\n\n결제 금액: ${finalPrice.toLocaleString()}원${discountAmount > 0 ? ` (${discountAmount.toLocaleString()}원 할인)` : ''}`);
    } else {
      addSystemMessage('무통장 입금 확인 요청이 전송되었습니다');
      addBotMessage(`입금 확인 요청을 보냈어! ✨\n\n금액: ${finalPrice.toLocaleString()}원\n\n관리자가 확인하면 바로 상담을 이어갈게!`);
    }
  };

  const getDbPrice = (menuId: number): number => dbProducts.find(p => p.menu_id === menuId)?.price || 0;

  // [이후 생략: 기존 JSX 렌더링 로직 동일]
  return (
    <div className="min-h-svh aurora-bg">
      {/* 기존 JSX 내용 그대로 유지 */}
      <ChatHeader sessionTime={sessionTime} counselorName={currentCounselor?.name} counselorImage={currentCounselor?.image} onBack={() => setView('landing')} onExit={() => setShowExitModal(true)} />
      {/* ... */}
      <main className="pt-20 pb-36 px-4 max-w-2xl mx-auto space-y-4">
        {messages.map((msg) => ( <MessageBubble key={msg.id} message={msg} counselorImage={currentCounselor?.image} /> ))}
        {isTyping && <TypingIndicator />}
        <div ref={chatEndRef} />
      </main>
      <ChatInput onSend={handleSend} onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} disabled={isTyping || timerExpired} />
      {/* 모달 및 기타 컴포넌트 생략 */}
      <AnimatePresence>{isMenuOpen && <MenuGrid onSelect={handleMenuSelect} onClose={() => setIsMenuOpen(false)} />}</AnimatePresence>
      {showTimeSelection && selectedMenuForTime && <TimeSelectionModal selectedMenu={selectedMenuForTime} allProducts={dbProducts} onSelect={handleTimeSelect} onClose={() => { setShowTimeSelection(false); setSelectedMenuForTime(null); }} />}
      {showPayment && session.selectedMenu && <PaymentModal menu={{ ...session.selectedMenu, price: getDbPrice(session.selectedMenu.id) }} userName={session.userName || userProfile?.nickname || ''} onClose={() => setShowPayment(false)} onPaymentSubmit={handlePaymentSubmit} couponActive={couponData.couponActive && !!couponData.couponCode} couponCode={couponData.couponCode} couponDiscount={couponData.couponDiscount} userCredits={userProfile?.credits || 0} />}
    </div>
  );
}
