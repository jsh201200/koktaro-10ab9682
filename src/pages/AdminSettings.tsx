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
      if (data) setDbProducts(data as DbProduct[]);
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

  // ✨ testMode 실시간 구독 (새로 추가!)
  useEffect(() => {
    const fetchTestMode = async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'testMode')
        .single();

      if (data && data.value !== null) {
        setTestMode(data.value.testMode === true || data.value === true);
      }
    };

    fetchTestMode();

    const channel = supabase
      .channel('test-mode-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_settings',
          filter: `key=eq.testMode`,
        },
        (payload) => {
          console.log('🔄 testMode 업데이트:', payload);
          if (payload.new && payload.new.value !== null) {
            setTestMode(payload.new.value.testMode === true || payload.new.value === true);
            console.log('✅ testMode 동기화됨:', payload.new.value.testMode);
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

  // ✨ 결제 승인 실시간 구독
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
  }, [session.dbSessionId, dbProducts, addSystemMessage, addBotMessage, updateSession, setSessionTime, setShowReview]);

  // ✨ activatePaidMode 함수
  const activatePaidMode = useCallback((durationMin: number, menuId: number, menuName: string, price: number) => {
    console.log('🎯 activatePaidMode 호출:', { menuId, menuName, price, durationMin });

    // 1,000원 상품 (menuId === 0)
    if (menuId === 0) {
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

      setTimeout(() => {
        addBotMessage(
          `✨ 럭키 컬러: 파란색\n` +
          `🍽️ 추천 음식: 흰쌀밥\n` +
          `🪬 오늘의 부적: 대나무`
        );
      }, 500);

      setTimeout(() => {
        addBotMessage("오늘의 기운을 모두 읽어드렸어요! 내일도 좋은 하루 되세요 ✨");
        updateSession({ isPaid: false, selectedMenu: null, freeReadingDone: false, questionCount: 0, sessionExpiry: null });
        setSessionTime(null);
        setShowReview(true);
      }, 2500);

      return;
    }

    // 일반 상담
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
  }, [session.userName, userProfile?.nickname, updateSession, addSystemMessage, addBotMessage, setSessionTime, setShowReview]);

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

    // 1,000원 상품 - 1회 질문만 허용
    if (session.isPaid && session.selectedMenu && session.selectedMenu.id === 0) {
      addBotMessage("오늘의 기운을 모두 읽어드렸어요! 내일도 좋은 하루 되세요 ✨");
      updateSession({ isPaid: false, selectedMenu: null, freeReadingDone: false, questionCount: 0, sessionExpiry: null });
      setSessionTime(null);
      setShowReview(true);
      return;
    }

    // 결제 고객 기억력
    if (session.isPaid && session.selectedMenu) {
      if (session.questionCount >= session.maxQuestions + 1) {
        addBotMessage("이번 고민에 대한 기운은 여기까지야! 더 깊은 상담은 메뉴에서 새로 골라줘! 🌟");

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

    // 미결제 상태 - 호칭 입력
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

    // 타이머 만료
    if (timerExpired) {
      addBotMessage('⏰ 상담 시간이 종료됐어! 더 깊은 상담을 원한다면 연장 결제를 해줘! ✨');
      return;
    }

    // 사진 업로드
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

    // 무료 읽기 완료 후 결제 유도
    if (session.selectedMenu && !session.isPaid && !session.freeReadingDone) {
      updateSession({ freeReadingDone: true });
      setTimeout(() => {
        addBotMessage(`이 기운의 핵심은 심층 리딩에서만 볼 수 있어! 💎\n\n지금 바로 확인해볼래?`);
      }, 1500);
    }
  };

  const handleMenuSelect = async (menu: Menu) => {
    setIsMenuOpen(false);

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
      roomId,
      counselorId: counselor.id,
    });

    // 1,000원 상품
    if (menu.id === 0) {
      if (testMode) {
        activatePaidMode(30, menu.id, actualMenu.name, actualMenu.price);
        addSystemMessage('🧪 테스트 모드: 결제 없이 상담 시작');
        return;
      }
      setShowPayment(true);
      return;
    }

    // 프리미엄 (59,000원)
    if (menu.id === 16) {
      setShowPremiumForm(true);
      return;
    }

    // 일반 상담
    if (testMode) {
      activatePaidMode(30, menu.id, actualMenu.name, actualMenu.price);
      addSystemMessage('🧪 테스트 모드: 결제 없이 상담 시작');
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

  // ✨ 결제 요청 처리
  const handlePaymentSubmit = async (method: 'kakaopay' | 'bank', depositor: string, phoneTail: string) => {
    const menu = session.selectedMenu!;
    setShowPayment(false);

    const dbPrice = getDbPrice(menu.id);
    let discountAmount = 0;
    let discountType = '';
    let finalPrice = dbPrice;

    // 쿠폰 자동 적용
    if (couponData.couponActive && couponData.couponCode && dbPrice >= 9900) {
      discountAmount = couponData.couponDiscount;
      discountType = 'site_coupon';
      finalPrice = Math.max(0, dbPrice - discountAmount);
    }

    const chatLog = messages.map(m => `[${m.role}] ${m.content}`);

    console.log('💳 결제 요청 저장:', {
      session_id: session.dbSessionId,
      menu_id: menu.id,
      menu_name: menu.name,
      price: dbPrice,
      final_price: finalPrice,
      method,
    });

    // DB에 결제 기록 저장
    const { error } = await supabase.from('payments').insert({
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

    if (error) {
      console.error('❌ 결제 저장 실패:', error);
      toast.error('결제 요청 저장에 실패했습니다. 다시 시도해주세요.');
      return;
    }

    console.log('✅ 결제 요청 저장 완료!');

    updateSession({ paymentPending: true });

    // Discord 알림
    sendDiscordAlert({
      userName: session.userName || userProfile?.nickname || '',
      menuName: menu.name,
      menuId: menu.id,
      price: finalPrice,
      method,
      depositor,
      phoneTail,
    });

    // 사용자에게 메시지
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

    const { error } = await supabase.from('payments').insert({
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

    if (error) {
      console.error('❌ 프리미엄 신청 저장 실패:', error);
      toast.error('신청에 실패했습니다. 다시 시도해주세요.');
      return;
    }

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

  const currentCounselor = session.selectedMenu
    ? getCounselorForMenu(session.selectedMenu.id)
    : session.counselorId
      ? COUNSELORS.find(c => c.id === session.counselorId) || null
      : null;

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
          isAlert={sessionTime !== null && sessionTime <= 300}
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
        {isTyping && <TypingIndicator counselorImage={currentCounselor?.image} />}
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


