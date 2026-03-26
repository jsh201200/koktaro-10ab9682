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
import { useSiteSettings } from '@/stores/siteSettings';
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

const MENU_FALLBACK_PRICES: Record<number, number> = {
  0: 1000,
  1: 4900,
  2: 4900,
  3: 4900,
  4: 19000,
  5: 19000,
  6: 9900,
  7: 9900,
  8: 9900,
  9: 7900,
  10: 7900,
  11: 9900,
  12: 4900,
  13: 19000,
  14: 27900,
  15: 39000,
  16: 59000,
};

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
        console.warn('Warning: 세션 사용자 변경 감지 - 새 세션 생성');
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
  }, [resetSession]);

  useEffect(() => {
    const loadProducts = async () => {
      const { data } = await supabase.from('products').select('*').eq('enabled', true).order('sort_order');
      if (data) setDbProducts(data as DbProduct[]);
    };
    loadProducts();
  }, []);

  useEffect(() => {
    const fetchCoupon = async () => {
      const { data } = await supabase
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
    const fetchTestMode = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'testMode')
        .single();

      if (data && data.value !== null) {
        const isTest = data.value.testMode === true || data.value === true;
        setTestMode(isTest);
        console.log('testMode loaded:', isTest);
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
          console.log('testMode update:', payload);
          if (payload.new && payload.new.value !== null) {
            const isTest = payload.new.value.testMode === true || payload.new.value === true;
            setTestMode(isTest);
            console.log('testMode synchronized:', isTest);
            toast.info(`Test mode: ${isTest ? 'ON' : 'OFF'}`);
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
      'ian': `${timeGreeting}... 자산과 운명을 동시에 챙겨야 하는 시간이네요.`,
      'jihan': `${timeGreeting}! 오늘따라 운이 어떨까? 함께 봐봐!`,
      'songsengsang': `${timeGreeting}. 이 시간의 기운을 함께 읽어보겠습니다.`,
      'luna': `${timeGreeting}... 별들과 당신의 에너지가 공명하고 있어요.`,
      'suhyun': `${timeGreeting}... 당신의 마음이 저한테 들려요.`,
      'myunghwa': `${timeGreeting}. 자, 솔직하게 봐보자!`,
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

          addBotMessage(`${name}님 \n\n${icebreakerMsg}\n\n오늘은 어떤 운명을 들어보고 싶으신가요?`);
        } else if (name) {
          addBotMessage(`${name}! 좋은 호칭이야 \n\n어떤 운명의 문을 열어볼까?\n아래 '메뉴 보기' 버튼을 눌러 상담 메뉴를 확인해줘!`);
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
          addSystemMessage("기운이 다해가고 있어! 5분 뒤면 상담이 종료되니 서둘러줘!");
        }
        if (remaining === 60) {
          addSystemMessage("Timer: 1분 남았어! 마지막으로 궁금한 거 물어봐줄래?");
        }
        if (remaining <= 0) {
          setTimerExpired(true);
          addSystemMessage("Timer: 상담 시간이 종료되었습니다.");
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session.sessionExpiry, session.isPaid, addSystemMessage]);

  useEffect(() => {
    if (!session.dbSessionId) {
      console.warn('Warning: dbSessionId 없음, 구독 스킵');
      return;
    }

    console.log('Payment subscription started:', session.dbSessionId);

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
          console.log('Payment update detected:', payload);

          const updated = payload.new as any;
          console.log('Payment status:', updated.status);

          if (updated.status === 'approved') {
            console.log('Approved! Calling activatePaidMode');
            
            const product = dbProducts.find(p => p.menu_id === updated.menu_id);
            console.log('Product info:', product);

            if (!product) {
              console.error('Product not found:', updated.menu_id);
              toast.error('상품 정보를 찾을 수 없습니다');
              return;
            }

            const durationMin = product.duration_minutes || 30;
            console.log('Duration:', durationMin, 'minutes');

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
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Payment subscription unsubscribed');
      supabase.removeChannel(channel);
    };
  }, [session.dbSessionId, dbProducts, addSystemMessage, addBotMessage, updateSession, setSessionTime]);

  const activatePaidMode = useCallback((durationMin: number, menuId: number, menuName: string, price: number) => {
    console.log('activatePaidMode called:', { menuId, menuName, price, durationMin });

    if (menuId === 0) {
      updateSession({
        isPaid: true,
        sessionExpiry: null,
        maxQuestions: 0,
        questionCount: 0,
        paymentPending: false,
      });
      setTimerExpired(false);
      addSystemMessage("Payment approved!");
      toast.success("Payment confirmed!");

      setTimeout(() => {
        addBotMessage(
          `Lucky color: Blue\n` +
          `Recommended food: White rice\n` +
          `Today's charm: Bamboo`
        );
      }, 500);

      setTimeout(() => {
        addBotMessage("I've read all your fortune for today! Have a great day tomorrow!");
        updateSession({ isPaid: false, selectedMenu: null, freeReadingDone: false, questionCount: 0, sessionExpiry: null });
        setSessionTime(null);
        setShowReview(true);
      }, 2500);

      return;
    }

    updateSession({
      isPaid: true,
      sessionExpiry: Date.now() + durationMin * 60 * 1000,
      maxQuestions: menuId === 16 ? 3 : 1,
      questionCount: 0,
      paymentPending: false,
    });
    setTimerExpired(false);
    addSystemMessage("Payment approved! Starting deep reading.");
    toast.success("Payment confirmed! Continuing consultation");

    setTimeout(() => {
      const welcomeGuide = MENU_WELCOME_GUIDES[menuId];
      const name = session.userName || userProfile?.nickname || '';
      addBotMessage(welcomeGuide || `${name}, payment confirmed! Starting deep reading. Tell me what you're curious about!`);
    }, 800);
  }, [session.userName, userProfile?.nickname, updateSession, addSystemMessage, addBotMessage, setSessionTime]);

  const delayedTyping = useCallback((): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, TYPING_DELAY_MS));
  }, []);

  const getDbPrice = (menuId: number): number => {
    const product = dbProducts.find(p => p.menu_id === menuId);
    
    if (product && product.price > 0) {
      return product.price;
    }
    
    const fallbackPrice = MENU_FALLBACK_PRICES[menuId];
    if (fallbackPrice) {
      console.warn(`DB price not found, using fallback: ${menuId} -> ${fallbackPrice}won`);
      return fallbackPrice;
    }
    
    console.error(`Menu ${menuId} price not found, using default 9900`);
    return 9900;
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

      console.log('Bot response called:', {
        counselorId: counselorId || 'unknown',
        menuName: menuName,
        historyLength: history.length,
        roomId: session.roomId,
      });

      const response = await getGeminiResponse(
        userInput, history, menuName, isPaid, imageBase64, counselorId, menuPrice
      );
      addBotMessage(response);
    } catch {
      addBotMessage('기운이 잠시 흔들렸어... 다시 물어봐줘!');
    } finally {
      setIsTyping(false);
    }
  }, [messages, addBotMessage, setIsTyping, delayedTyping, session.roomId]);

  const handleCrossSelling = useCallback(() => {
    const currentCounselor = session.selectedMenu
      ? getCounselorForMenu(session.selectedMenu.id)
      : null;

    const recommendations: { [key: string]: { name: string; specialty: string } } = {
      'ian': { name: 'jihan', specialty: 'love fortune' },
      'jihan': { name: 'songsengsang', specialty: 'auspicious direction' },
      'songsengsang': { name: 'luna', specialty: 'tarot' },
      'luna': { name: 'suhyun', specialty: 'psychology consultation' },
      'suhyun': { name: 'myunghwa', specialty: 'practical solution' },
      'myunghwa': { name: 'ian', specialty: 'investment/wealth fortune' },
    };

    const recommendedCounselor = recommendations[currentCounselor?.id || 'ian'];

    addBotMessage(
      `Looks like your ${recommendedCounselor.specialty} is also complicated. \n\n` +
      `${recommendedCounselor.name} is an expert. Want to meet them?`
    );

    setTimeout(() => {
      setIsMenuOpen(true);
    }, 2000);
  }, [session.selectedMenu, addBotMessage]);

  const handleSend = async (text: string, image?: string) => {
    addUserMessage(text, image);

    if (session.isPaid && session.selectedMenu && session.selectedMenu.id === 0) {
      addBotMessage("I've read all your fortune for today! Have a great day tomorrow!");
      updateSession({ isPaid: false, selectedMenu: null, freeReadingDone: false, questionCount: 0, sessionExpiry: null });
      setSessionTime(null);
      setShowReview(true);
      return;
    }

    if (session.isPaid && session.selectedMenu) {
      if (session.questionCount >= session.maxQuestions + 1) {
        addBotMessage("That's all for this concern! Choose a new menu for deeper consultation!");

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
      
      console.log('Message send:', {
        counselorId: counselor.id,
        menuId: session.selectedMenu.id,
        roomId: session.roomId,
      });

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

    if (!session.userName && !userProfile?.nickname) {
      const name = text.trim().replace(/[^\uac00-\ud7a3a-zA-Z0-9\s]/g, '').trim();
      if (name) {
        updateSession({ userName: name });
        setIsTyping(true);
        await delayedTyping();
        setIsTyping(false);
        addBotMessage(`${name}! Good nickname. \n\nWhat destiny would you like to open?\nClick the 'View Menu' button below to see the consultation menu!`);
        return;
      }
      addBotMessage('Tell me your nickname again? Enter it in Korean or English!');
      return;
    }

    if (timerExpired) {
      addBotMessage('Timer: Consultation time is over! If you want deeper consultation, please make an extension payment!');
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
        addBotMessage(`The core of this fortune can only be seen in deep reading!\n\nWant to check it out right now?`);
      }, 1500);
    }
  };

  const handleMenuSelect = async (menu: Menu) => {
    setIsMenuOpen(false);

    const counselor = getCounselorForMenu(menu.id);
    const roomId = `room_${counselor.id}_${userProfile?.id || 'guest'}_${Date.now()}`;

    setMessages([]);
    greetingSent.current = false;

    const dbProduct = dbProducts.find(p => p.menu_id === menu.id);
    const actualMenu = dbProduct ? { ...menu, price: dbProduct.price, name: dbProduct.name } : menu;
    const durationMin = dbProduct?.duration_minutes || 30;

    updateSession({
      selectedMenu: actualMenu,
      freeReadingDone: false,
      questionCount: 0,
      imageFailCount: 0,
      userName: session.userName || userProfile?.nickname || '',
      roomId,
      counselorId: counselor.id,
    });

    console.log('Menu selected:', {
      counselorId: counselor.id,
      roomId: roomId,
      menuId: menu.id,
      menuName: actualMenu.name,
    });

    if (menu.id === 0) {
      if (testMode) {
        activatePaidMode(30, menu.id, actualMenu.name, actualMenu.price);
        addSystemMessage('Test mode: Starting consultation without payment');
        return;
      }
      setShowPayment(true);
      return;
    }

    if (menu.id === 16) {
      setShowPremiumForm(true);
      return;
    }

    if (testMode) {
      activatePaidMode(30, menu.id, actualMenu.name, actualMenu.price);
      addSystemMessage('Test mode: Starting consultation without payment');
      setTimeout(() => {
        const welcomeGuide = MENU_WELCOME_GUIDES[menu.id];
        const name = session.userName || userProfile?.nickname || '';
        addBotMessage(welcomeGuide || `${name}, starting ${actualMenu.name} consultation! Tell me what you're curious about!`);
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
      'Analyze the photo',
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
      addSystemMessage("Chat history deleted.");
    }

    localStorage.removeItem('howl_session_id');
    localStorage.removeItem('howl_profile_id');
    const newSessionId = `session_${Date.now()}_${Math.random()}`;
    localStorage.setItem('howl_session_id', newSessionId);
    sessionIdRef.current = newSessionId;

    resetSession();
    setView('landing');
    setUserProfile(null);
    toast.info("Consultation ended");
  };

  const handlePaymentSubmit = async (method: 'kakaopay' | 'bank', depositor: string, phoneTail: string) => {
    const menu = session.selectedMenu!;
    setShowPayment(false);

    const dbPrice = getDbPrice(menu.id);
    let discountAmount = 0;
    let discountType = '';
    let finalPrice = dbPrice;

    if (couponData.couponActive && couponData.couponCode && dbPrice >= 9900) {
      discountAmount = couponData.couponDiscount;
      discountType = 'site_coupon';
      finalPrice = Math.max(0, dbPrice - discountAmount);
    }

    const chatLog = messages.map(m => `[${m.role}] ${m.content}`);

    console.log('Payment request saved:', {
      session_id: session.dbSessionId,
      menu_id: menu.id,
      menu_name: menu.name,
      price: dbPrice,
      final_price: finalPrice,
      method,
    });

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
      console.error('Payment save failed:', error);
      toast.error('Payment request failed. Please try again.');
      return;
    }

    console.log('Payment request saved successfully!');

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
      addSystemMessage('KakaoPay payment request sent');
      addBotMessage(`KakaoPay payment link opened! Admin is checking, please wait. \n\nPayment amount: ${finalPrice.toLocaleString()}won${discountAmount > 0 ? ` (${discountAmount.toLocaleString()}won discount applied)` : ''}`);
    } else {
      addSystemMessage('Bank transfer confirmation request sent');
      addBotMessage(`Transfer confirmation request sent! \n\nAmount: ${finalPrice.toLocaleString()}won${discountAmount > 0 ? ` (${discountAmount.toLocaleString()}won discount)` : ''}\n\nAdmin will confirm and continue consultation!`);
    }
  };

  const handlePremiumSubmit = async (questions: string[], depositor: string, phoneTail: string) => {
    setShowPremiumForm(false);
    const dbProduct = dbProducts.find(p => p.menu_id === 16);
    const price = dbProduct?.price || 59000;
    const menu = { id: 16, name: dbProduct?.name || 'Comprehensive Destiny Analysis', price } as Menu;
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
      console.error('Premium application save failed:', error);
      toast.error('Application failed. Please try again.');
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

    addSystemMessage('Premium consultation application received');
    addBotMessage(`Premium comprehensive destiny analysis application completed! \n\nAmount: ${price.toLocaleString()}won\n\nI will write an in-depth report after confirming payment!`);
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

    setView('landing');
    console.log('Login completed, moving to main screen');
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
              toast.info(`Current credits: ${userProfile.credits.toLocaleString()}won`);
            }
          }}
        />
        <button
          onClick={() => navigate('/admin')}
          className="fixed top-3 right-3 z-[60] p-2 rounded-full glass hover:bg-muted/60 transition-colors"
          title="Admin dashboard"
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

  console.log('Current counselor:', {
    counselorId: session.counselorId,
    counselorName: currentCounselor?.name,
    roomId: session.roomId,
  });

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
            <h3 className="font-display text-lg font-bold text-foreground mb-3">End consultation?</h3>
            <p className="text-sm text-muted-foreground mb-6">What about the chat history?</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleExitChat(false)}
                className="flex-1 py-2.5 rounded-2xl glass text-sm font-semibold hover:bg-muted/40 transition-colors"
              >
                Keep
              </button>
              <button
                onClick={() => handleExitChat(true)}
                className="flex-1 py-2.5 rounded-2xl bg-destructive/20 text-destructive text-sm font-semibold hover:bg-destructive/30 transition-colors"
              >
                Delete
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
          timerExpired ? 'Consultation time has ended'
            : !session.userName && !userProfile?.nickname ? 'Enter your nickname...'
              : 'Send message...'
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
              Premium: Pay and Continue ({getDbPrice(session.selectedMenu.id).toLocaleString()}won)
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
        title="Admin dashboard"
      >
        <Settings className="w-4 h-4 text-muted-foreground" />
      </button>

      <div className="fixed bottom-0 w-full text-center pb-1 z-30 pointer-events-none">
        <p className="text-[8px] text-muted-foreground/60 max-w-2xl mx-auto px-4">
          This service is insight edutainment content based on data analysis, and consultation results are for self-exploration reference only and do not guarantee legal responsibility.
        </p>
      </div>
    </div>
  );
}
