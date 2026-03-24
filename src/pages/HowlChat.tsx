import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
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

const generateColors = (): string[] => [
  "보라색", "파란색", "녹색", "주황색", "분홍색", "노란색", "빨간색", "수색", "민트색", "자주색",
];

const generateNumbers = (): number[] => [
  7, 3, 9, 5, 2, 8, 1, 6, 4, 11, 13, 17, 21, 27, 33
];

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
  
  const [showTimeSelection, setShowTimeSelection] = useState(false);
  const [selectedMenuForTime, setSelectedMenuForTime] = useState<DbProduct | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const greetingSent = useRef(false);
  const sessionIdRef = useRef<string>(localStorage.getItem('howl_session_id') || `session_${Date.now()}_${Math.random()}`);

  // ✨ 세션 검증 및 초기화
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
        console.warn('⚠️ 세션 사용자 변경 감지 - 새 세션 생성');
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

  useEffect(() => {
    const loadProducts = async () => {
      const { data } = await supabase.from('products').select('*').eq('enabled', true).order('sort_order');
      if (data) setDbProducts(data);
    };
    loadProducts();
  }, []);

  useEffect(() => {
    const fetchCoupon = async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'coupon')
        .single();

      if (data && data.value) {
        setCouponData(data.value as CouponData);
      }
    };

    fetchCoupon();

    const channel = supabase
      .channel('coupon-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'site_settings',
          filter: `key=eq.coupon`,
        },
        (payload) => {
          if (payload.new && payload.new.value) {
            setCouponData(payload.new.value as CouponData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  // ✨ 아이스브레이킹: 시간별 센스있는 멘트
  const getIcebreakerMessage = useCallback((counselorId: string, userName: string) => {
    const hour = new Date().getHours();

    let timeGreeting = '';
    if (hour >= 5 && hour < 9) {
      timeGreeting = '새벽부터 고민이 깊으신가 봐요';
    } else if (hour >= 9 && hour < 12) {
      timeGreeting = '오전이 반짝반짝한 시간이네요';
    } else if (hour >= 12 && hour < 18) {
      timeGreeting = '오후의 햇살이 운명을 밝혀줄 거예요';
    } else if (hour >= 18 && hour < 22) {
      timeGreeting = '저녁 별들이 당신의 이야기를 듣고 싶어해요';
    } else {
      timeGreeting = '밤은 진실이 드러나는 시간이에요';
    }

    const counselorTones: { [key: string]: string } = {
      'ian': `${timeGreeting}... 자산과 운명을 동시에 챙겨야 하는 시간이네요. 💼`,
      'jihan': `${timeGreeting}! 오늘따라 운이 어떨까? 함께 봐봐! 😎`,
      'songsengsang': `${timeGreeting}. 이 시간의 기운을 함께 읽어보겠습니다. ✨`,
      'luna': `${timeGreeting}... 별들과 당신의 에너지가 공명하고 있어요. 🌙`,
      'suhyun': `${timeGreeting}... 당신의 마음이 저한테 들려요. 🫂`,
      'myunghwa': `${timeGreeting}. 자, 솔직하게 봐보자! 🔥`,
    };

    return counselorTones[counselorId] || timeGreeting;
  }, []);

  useEffect(() => {
    if (view === 'chat' && !greetingSent.current && messages.length === 0) {
      greetingSent.current = true;
      const name = userProfile?.nickname || session.userName;
      setTimeout(() => {
        if (name && session.selectedMenu) {
          const counselor = getCounselorForMenu(session.selectedMenu.id);
          const icebreakerMsg = getIcebreakerMessage(counselor.id, name);

          addBotMessage(`${name}님 ✨\n\n${icebreakerMsg}\n\n오늘은 어떤 운명을 들어보고 싶으신가요?`);
        } else if (name) {
          addBotMessage(`${name}! 좋은 호칭이야 ✨\n\n어떤 운명의 문을 열어볼까?\n아래 '메뉴 보기' 버튼을 눌러 상담 메뉴를 확인해줘! 🔮`);
        } else {
          addBotMessage(settings.welcomeMessage);
        }
      }, 500);
    }
  }, [view, messages.length, session.selectedMenu, getIcebreakerMessage, settings.welcomeMessage, userProfile?.nickname, session.userName, addBotMessage]);

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
  }, [session.sessionExpiry, session.isPaid, addSystemMessage]);

  // ✨ 결제 승인 실시간 구독 (수정됨!)
  useEffect(() => {
    if (!session.dbSessionId) {
      console.warn('⚠️ dbSessionId 없음, 구독 스킵');
      return;
    }

    console.log('🔔 결제 구독 시작:', session.dbSessionId);

    const channel = supabase
      .channel(`payment-approval-${session.dbSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `session_id=eq.${session.dbSessionId}`,
        },
        async (payload) => {
          console.log('📢 결제 업데이트 감지:', payload);

          const updated = payload.new as any;
          console.log('결제 상태:', updated.status);

          if (updated.status === 'approved') {
            console.log('✅ 승인됨! activatePaidMode 호출');
            
            const product = dbProducts.find(p => p.menu_id === updated.menu_id);
            console.log('상품 정보:', product);

            if (!product) {
              console.error('❌ 상품을 찾을 수 없음:', updated.menu_id);
              toast.error('상품 정보를 찾을 수 없습니다');
              return;
            }

            const durationMin = product.duration_minutes || 30;
            console.log('상담 시간:', durationMin, '분');

            activatePaidMode(
              durationMin,
              updated.menu_id,
              updated.menu_name || product.name,
              updated.final_price || updated.price
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('구독 상태:', status);
      });

    return () => {
      console.log('🔌 결제 구독 해제');
      supabase.removeChannel(channel);
    };
  }, [session.dbSessionId, dbProducts]);

  // ✨ activatePaidMode 함수
  const activatePaidMode = useCallback((durationMin: number, menuId: number, menuName: string, price: number) => {
    console.log('🎯 activatePaidMode 호출:', { menuId, menuName, price, durationMin });

    if (menuId === 0) {
      // ✅ 한줄 조언 (1,000원)
      updateSession({
        isPaid: true,
        sessionExpiry: null,
        maxQuestions: 0,
        questionCount: 0,
        paymentPending: false,
      });
      setTimerExpired(false);
      addSystemMessage("💜 결제가 승인되었습니다!");
      toast.success("입금 확인 완료! ✨");

      const adviceList = generateAdviceMessages();
      const colorList = generateColors();
      const numberList = generateNumbers();

      const randomAdvice = adviceList[Math.floor(Math.random() * adviceList.length)];
      const randomColor = colorList[Math.floor(Math.random() * colorList.length)];
      const randomNumber = numberList[Math.floor(Math.random() * numberList.length)];

      setTimeout(() => {
        addBotMessage(
          `✨ 오늘의 조언:\n\n${randomAdvice}\n\n` +
          `🎨 럭키 컬러: ${randomColor}\n` +
          `🔢 행운의 숫자: ${randomNumber}`
        );
      }, 500);

      setTimeout(() => {
        addBotMessage("오늘의 기운을 모두 읽어드렸어요! 내일도 좋은 하루 되세요 ✨");
        updateSession({ isPaid: false, selectedMenu: null, freeReadingDone: false, questionCount: 0, sessionExpiry: null });
        setSessionTime(null);
        setShowReview(true);
      }, 3000);

      return;
    }

    // ✅ 타로 1Q (3,900원) - menu_id 36~39는 다 동일
    if ([36, 37, 38, 39].includes(menuId)) {
      updateSession({
        isPaid: true,
        sessionExpiry: null,
        maxQuestions: 1,
        questionCount: 0,
        paymentPending: false,
      });
      setTimerExpired(false);
      addSystemMessage("💜 결제가 승인되었습니다!");
      toast.success("입금 확인 완료! ✨");

      setTimeout(() => {
        addBotMessage(`✨ 타로 카드 리딩이 시작됐어요!\n\n궁금한 질문을 하나 해주세요 🔮`);
      }, 500);

      return;
    }

    // ✅ 나머지 메뉴 (9,900원~59,000원) - 시간대로
    updateSession({
      isPaid: true,
      sessionExpiry: Date.now() + durationMin * 60 * 1000,
      maxQuestions: menuId === 16 ? 3 : 1,
      questionCount: 0,
      paymentPending: false,
    });
    setTimerExpired(false);
    addSystemMessage("💜 결제가 승인되었습니다! 심층 리딩을 시작합니다.");
    toast.success("입금 확인 완료! 상담을 이어갑니다 ✨");

    setTimeout(() => {
      const welcomeGuide = MENU_WELCOME_GUIDES[menuId];
      const name = session.userName || userProfile?.nickname || '';
      addBotMessage(welcomeGuide || `${name}님, 결제가 확인됐어! 이제 심층 리딩을 시작할게 ✨ 궁금한 것을 말씀해주세요!`);
    }, 800);
  }, [updateSession, addSystemMessage, addBotMessage, session.userName, userProfile?.nickname, setShowReview]);

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

  // ✨ 크로스셀링 함수
  const handleCrossSelling = useCallback(() => {
    const currentCounselor = session.selectedMenu
      ? getCounselorForMenu(session.selectedMenu.id)
      : null;

    const recommendations: { [key: string]: { name: string; specialty: string } } = {
      'ian': { name: '지한', specialty: '연애운' },
      'jihan': { name: '송선생', specialty: '길방' },
      'songsengsang': { name: '루나', specialty: '타로' },
      'luna': { name: '수현', specialty: '심리상담' },
      'suhyun': { name: '명화', specialty: '실질 해결책' },
      'myunghwa': { name: '이안', specialty: '투자/재물운' },
    };

    const recommendedCounselor = recommendations[currentCounselor?.id || 'ian'];

    addBotMessage(
      `음... 보니까 ${recommendedCounselor.specialty} 쪽도 복잡하게 얽혀있네. 💫\n\n` +
      `'${recommendedCounselor.name}'이(가) 전문가야. 한번 만나볼래?`
    );

    setTimeout(() => {
      setIsMenuOpen(true);
    }, 2000);
  }, [session.selectedMenu, addBotMessage, setIsMenuOpen]);

  const handleSend = async (text: string, image?: string) => {
    addUserMessage(text, image);

    // 🎟️ 1,000원 상품 - 1회 질문만 허용 후 즉시 차단
    if (session.isPaid && session.selectedMenu && session.selectedMenu.id === 0) {
      addBotMessage("오늘의 기운을 모두 읽어드렸어요! 내일도 좋은 하루 되세요 ✨");
      updateSession({ isPaid: false, selectedMenu: null, freeReadingDone: false, questionCount: 0, sessionExpiry: null });
      setSessionTime(null);
      setShowReview(true);
      return;
    }

    // ✨ 결제 고객 기억력: 결제 완료자면 이름 묻지 않고 바로 진행
    if (session.isPaid && session.selectedMenu) {
      if (session.questionCount >= session.maxQuestions + 1) {
        addBotMessage("이번 고민에 대한 기운은 여기까지야! 더 깊은 상담은 메뉴에서 새로 골라줘! 🌟");

        // ✨ 크로스셀링 로직
        setTimeout(() => {
          handleCrossSelling();
        }, 1500);

        updateSession({ isPaid: false, selectedMenu: null, freeReadingDone: false, questionCount: 0, sessionExpiry: null });
        setSessionTime(null);
        setShowReview(true);
        return;
      }

      if (image && [2, 12].includes(session.selectedMenu.id)) {
        setShowScan(image);
        return;
      }

      updateSession({ questionCount: session.questionCount + 1 });
      const counselor = getCounselorForMenu(session.selectedMenu.id);
      await handleBotResponse(
        text,
        session.selectedMenu.name,
        true,
        image,
        counselor.id,
        getDbPrice(session.selectedMenu.id)
      );
      return;
    }

    // ✨ 미결제 상태 체크
    if (!session.userName && !userProfile?.nickname) {
      const name = text.trim().replace(/[^\uac00-\ud7a3a-zA-Z0-9\s]/g, '').trim();
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
      addBotMessage('⏰ 상담 시간이 종료됐어! 더 깊은 상담을 원한다면 연장 결제를 해줘! ✨');
      return;
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

  // 🆕 메뉴 선택 → 시간 선택 또는 바로 결제
  const handleMenuSelect = async (menu: Menu) => {
    setIsMenuOpen(false);

    const baseName = menu.name.split(' - ')[0].trim();
    const relatedProducts = dbProducts.filter(p => {
      const pBaseName = p.name.split(' - ')[0].trim();
      return pBaseName === baseName && p.enabled;
    });

    if (relatedProducts.length > 1) {
      const product = dbProducts.find(p => p.menu_id === menu.id);
      if (product) {
        setSelectedMenuForTime(product);
        setShowTimeSelection(true);
      }
      return;
    }

    proceedWithMenu(menu);
  };

  // 🆕 시간 선택 후
  const handleTimeSelect = (product: DbProduct) => {
    setShowTimeSelection(false);
    setSelectedMenuForTime(null);

    const menu: Menu = {
      id: product.menu_id,
      name: product.name,
      icon: product.icon,
      price: product.price,
      category: 'menu',
      categoryName: 'Menu',
    };

    proceedWithMenu(menu, product.price, product.duration_minutes);
  };

  // 🆕 실제 메뉴 선택 처리
  const proceedWithMenu = (menu: Menu, price?: number, duration?: number) => {
    const counselor = getCounselorForMenu(menu.id);
    const roomId = `room_${counselor.id}_${Date.now()}`;

    const dbProduct = dbProducts.find(p => p.menu_id === menu.id);
    const actualMenu = dbProduct 
      ? { ...menu, price: dbProduct.price, name: dbProduct.name } 
      : { ...menu, price: price || menu.price };

    updateSession({
      selectedMenu: actualMenu,
      freeReadingDone: false,
      questionCount: 0,
      imageFailCount: 0,
      userName: session.userName || userProfile?.nickname || '',
      roomId,
      counselorId: counselor.id,
    });

    if (menu.id === 0) {
      if (loadSettings().testMode) {
        activatePaidMode(30, menu.id, actualMenu.name, actualMenu.price);
        addSystemMessage('🤖 테스트 모드: 결제 없이 상담 시작');
        return;
      }
      setShowPayment(true);
      return;
    }

    if (menu.id === 16) {
      setShowPremiumForm(true);
      return;
    }

    if (loadSettings().testMode) {
      activatePaidMode(duration || 30, menu.id, actualMenu.name, actualMenu.price);
      addSystemMessage('🤖 테스트 모드: 결제 없이 상담 시작');
      setTimeout(() => {
        const welcomeGuide = MENU_WELCOME_GUIDES[menu.id];
        const name = session.userName || userProfile?.nickname || '';
        addBotMessage(welcomeGuide || `${name}님, ${actualMenu.name} 상담을 시작할게요! 궁금한 것을 말씀해주세요 ✨`);
      }, 800);
      return;
    }

    setShowPayment(true);
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

  const handleExitChat = async (deleteChat: boolean) => {
    setShowExitModal(false);

    if (deleteChat) {
      await supabase.from('messages').delete().eq('session_id', session.dbSessionId);
      addSystemMessage("대화 내용이 삭제되었습니다.");
    }

    // 🔐 세션 완전 초기화
    localStorage.removeItem('howl_session_id');
    localStorage.removeItem('howl_profile_id');
    const newSessionId = `session_${Date.now()}_${Math.random()}`;
    localStorage.setItem('howl_session_id', newSessionId);
    sessionIdRef.current = newSessionId;

    resetSession();
    setView('landing');
    setUserProfile(null);
    toast.info("상담을 종료했습니다 ✨");
  };

  const handlePaymentSubmit = async (method: 'kakaopay' | 'bank', depositor: string, phoneTail: string) => {
    const menu = session.selectedMenu!;
    setShowPayment(false);

    const dbPrice = getDbPrice(menu.id);
    let discountAmount = 0;
    let discountType = '';
    let finalPrice = dbPrice;

    // 🎟️ site_settings의 쿠폰 자동 적용
    if (couponData.couponActive && couponData.couponCode && dbPrice >= 9900) {
      discountAmount = couponData.couponDiscount;
      discountType = 'site_coupon';
      finalPrice = Math.max(0, dbPrice - discountAmount);
    }

    const chatLog = messages.map(m => `[${m.role}] ${m.content}`);

    console.log('💳 결제 요청 저장:', {
      session_id: session.dbSessionId,
      menu_id: menu.id,
      price: dbPrice,
      final_price: finalPrice,
    });

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
    localStorage.setItem('howl_last_auth_id', profile.id);
    localStorage.setItem('howl_last_auth_time', Date.now().toString());
    
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
          couponActive={couponData.couponActive && !!couponData.couponCode}
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
          onClick={() => navigate('/admin')}
          className="fixed top-3 right-3 z-[60] p-2 rounded-full glass hover:bg-muted/60 transition-colors"
          title="관리자 대시보드"
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
          onExtend={() => setShowPayment(true)}
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
          </div>
        </div>
      )}

      <AnimatePresence>
        {isMenuOpen && (
          <MenuGrid onSelect={handleMenuSelect} onClose={() => setIsMenuOpen(false)} />
        )}
      </AnimatePresence>

      {showTimeSelection && selectedMenuForTime && (
        <TimeSelectionModal
          selectedMenu={selectedMenuForTime}
          allProducts={dbProducts}
          onSelect={handleTimeSelect}
          onClose={() => {
            setShowTimeSelection(false);
            setSelectedMenuForTime(null);
          }}
        />
      )}

      {showPayment && session.selectedMenu && (
        <PaymentModal
          menu={{ ...session.selectedMenu, price: getDbPrice(session.selectedMenu.id) }}
          userName={session.userName || userProfile?.nickname || ''}
          onClose={() => setShowPayment(false)}
          onPaymentSubmit={handlePaymentSubmit}
          couponActive={couponData.couponActive && !!couponData.couponCode}
          couponCode={couponData.couponCode}
          couponDiscount={couponData.couponDiscount}
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
          onClose={() => {
            setShowReview(false);
            setShowPremiumReport(true);
          }}
        />
      )}

      {showPremiumReport && (
        <PremiumReport
          counselorName={currentCounselor?.name || ''}
          menuName={session.selectedMenu?.name || ''}
          userName={userProfile?.nickname || ''}
          chatMessages={messages}
          onClose={() => setShowPremiumReport(false)}
        />
      )}

      <button
        onClick={() => navigate('/admin')}
        className="fixed top-3 right-3 z-[60] p-2 rounded-full glass hover:bg-muted/60 transition-colors"
        title="관리자 대시보드"
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
