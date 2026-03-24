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

export default function HowlChat() {
  const {
    messages, session, isTyping, setIsTyping,setMessages,
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
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [couponData, setCouponData] = useState<CouponData>({
    couponCode: '',
    couponDiscount: 0,
    couponActive: false,
  });
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
  }, [view, messages.length, session.selectedMenu, getIcebreakerMessage, settings.welcomeMessage]);

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

      // 🆕 파일 최상단(컴포넌트 바깥)에 승하님의 정성 가득한 리스트 배치
const ADVICE_MESSAGES = [
  "지금의 침체가 영원하지 않아요. 다음 달쯤이면 새로운 기회의 문이 열릴 거야. 그때를 대비해서 지금 하나씩 준비하는 게 가장 현명한 태도야. 작은 행동이 모여 큰 변화를 만들거든.",
  "주변의 목소리에 흔들리지 말고 자신의 직관을 믿어봐. 너는 이미 답을 알고 있어. 지금 필요한 건 다른 사람의 조언이 아니라 자신에 대한 신뢰야. 그 확신을 가지고 한 발 내딛는 것, 그게 전부야.",
  "더 이상 같은 실수를 반복하지 말고 이번엔 다른 방식으로 접근해봐. 과거를 바꿀 순 없지만 미래는 얼마든지 다르게 만들 수 있어. 한 번의 도전이 모든 걸 바꿀 수도 있다는 걸 기억해.",
  "지금이 가장 힘든 시간일 수도 있지만, 이 경험이 나중에 가장 큰 자산이 될 거야. 어려움을 견디는 과정이 성장이거든. 포기하지 말고 한 계단씩 올라가다 보면 분명 좋은 날이 온다고 믿어.",
  "혼자라고 느껴지겠지만 넌 혼자가 아니야. 너를 응원하는 사람들이 있고, 어떤 상황에서든 너는 충분하다는 걸 잊지 말아. 가끔 누군가에게 도움을 청하는 것도 용감한 거야. 너의 가치를 스스로 깎아내리지 마.",
  "지금 주어진 기회를 놓치지 말아. 나중에 '그때 했으면'이 후회로 바뀌기 전에 지금 바로 행동해봐. 완벽하지 않아도 괜찮아. 시작하는 것 자체가 이미 반 이상을 온 거니까. 용기 내서 한 발 내디뎌봐.",
  "너의 약점이라고 생각하는 게 사실은 너의 가장 큰 강점일 수도 있어. 남과 다르다고 해서 모자란 게 아니야. 그 차이가 너를 특별하게 만드는 거야. 자신을 받아들이고 그대로 나아가봐.",
  "계획만 세우고 실행하지 않으면 아무것도 바뀌지 않아. 지금 당장 할 수 있는 작은 것부터 시작해봐. 큰 변화는 작은 행동들의 모임에서 나온다고. 미루지 말고 오늘부터 움직여봐.",
  "이 고민도 시간이 지나면 웃으면서 이야기할 날이 올 거야. 지금은 힘들 수 있지만 모든 일은 그 나름의 의미가 있다고 믿어. 현재의 고통이 미래의 지혜로 변할 거니까. 견뎌내는 것도 힘이야.",
  "남의 성공과 너를 비교하지 말아. 각자의 타이밍이 다르고 각자의 길이 다르거든. 너는 너의 속도로 충분히 잘하고 있어. 자기 인생에만 집중하면 분명 좋은 결과가 따라올 거야.",
  "지금 당장 눈에 보이는 변화가 없다고 해서 멈춰있다고 생각하지 마세요. 뿌리는 보이지 않는 땅속에서 가장 깊게 뻗어나가는 법이니까요. 지금의 인내와 준비가 나중에 당신을 가장 단단하게 지탱해줄 뿌리가 될 거예요. 조금만 더 자신을 믿고 기다려봐.",
  "선택의 기로에서 두려움이 앞선다면, 그건 당신이 그만큼 더 나은 삶을 원한다는 증거예요. 세상에 틀린 선택은 없어요. 어떤 길을 가든 그 길 위에서 배우고 채워나가는 건 당신의 몫이니까, 스스로의 가능성을 믿고 지금 이 순간 가장 마음이 이끄는 곳으로 자신감 있게 나아가봐.",
  "꽃마다 피는 계절이 다르듯 당신만의 전성기도 반드시 찾아와요. 남들이 먼저 피었다고 해서 조급해할 필요 전혀 없어요. 당신은 지금 가장 크고 아름다운 꽃을 피우기 위해 내실을 다지는 중이니까, 타인의 속도에 맞추지 말고 당신만의 고유한 속도를 묵묵히 지켜내길 바라.",
  "막다른 길처럼 느껴진다면 그건 새로운 길을 찾아야 한다는 신호일 뿐이에요. 벽은 당신을 막기 위해 있는 게 아니라, 당신이 얼마나 간절히 넘고 싶은지를 묻기 위해 서 있는 거거든요. 유연한 마음으로 주변을 둘러보면 당신을 위해 준비된 또 다른 통로가 반드시 보일 거예요.",
  "당신이 가진 빛은 생각보다 훨씬 밝고 따뜻해요. 단지 지금 잠시 구름에 가려져 보이지 않을 뿐이죠. 구름은 바람이 불면 결국 흩어지기 마련이니, 당신의 본 모습이 다시 세상을 환하게 비출 때까지 스스로를 다독이며 조금만 더 기다려주는 여유와 자애로움을 가져보세요.",
  "완벽한 타이밍을 기다리다가는 영원히 시작하지 못할지도 몰라요. 지금 부족해 보이는 그대로 일단 시작해보세요. 부족한 부분은 길을 가면서 채워 넣으면 그만이니까요. 일단 움직이기 시작하면 정지해 있을 때 보이지 않던 해결책들이 마법처럼 당신 앞에 나타날 거예요.",
  "과거의 그림자가 오늘을 덮치게 두지 마세요. 어제의 실수는 오늘을 위한 값진 교훈일 뿐, 당신의 가치를 결정짓는 잣대가 아니에요. 당신은 매일 새롭게 시작할 권리가 있고, 오늘부터 다시 써 내려가는 당신의 이야기는 이전과는 완전히 다른 눈부신 빛을 낼 수 있어요.",
  "세상이 등 돌린 것 같은 기분이 들 때조차 당신을 믿어주는 존재가 있다는 걸 잊지 마세요. 그 존재가 때로는 당신 자신이 되어야 할 때도 있어요. 스스로에게 가장 친절하고 따뜻한 친구가 되어주세요. 당신이 당신을 온전히 사랑할 때 비로소 세상도 당신을 향해 웃어줄 거예요.",
  "힘든 시기를 지나는 중이라면 당신은 지금 긴 터널 속에 있는 거예요. 하지만 터널의 끝엔 반드시 빛이 있고, 당신은 그 빛을 향해 한 걸음씩 확실히 다가가고 있어요. 지금의 어둠은 더 밝은 빛을 만나기 위한 과정일 뿐이니, 당신의 발걸음을 멈추지 말고 끝까지 힘을 내봐요.",
  "먼 훗날 지금의 시간을 돌아봤을 때 '그때 정말 잘 견뎠다'며 스스로를 대견해할 날이 반드시 올 거예요. 당신의 노력은 결코 헛되지 않아요. 우주에 흩뿌린 당신의 열정이 머지않아 큰 행운의 별이 되어 당신의 머리 위로 쏟아질 거니까, 확신을 가지고 오늘을 당당하게 살아보세요.",
  "지금 당장 돈이 안 돌아서 답답하지? 근데 물 들어오기 전에는 항상 썰물인 법이야. 지금은 억지로 잡으려 하지 말고 네 그릇을 키우는 시간이라 생각해. 곧 큰 파도가 올 텐데 그때 담을 준비가 되어 있어야 하거든. 조금만 더 버텨봐, 금방 채워질 거야.",
  "네 가치를 통장 잔고 숫자에 매기지 마. 잔고가 네 인생의 성적표는 아니니까. 지금은 잠시 숫자가 작아 보일 수 있어도 네가 가진 재능과 잠재력은 어디 안 가. 네 능력을 믿고 꾸준히 밀고 나가면 돈은 자연스럽게 너를 따라오게 될 거야. 너 자신을 믿는 게 재물운의 시작이야.",
  "큰돈 벌 생각만 하다가 정작 새어 나가는 작은 돈들을 우습게 보진 않았니? 결국 큰 산도 흙 한 줌부터 시작되는 거야. 오늘부터라도 네 손을 거쳐 가는 작은 돈들을 귀하게 여기기 시작해봐. 그 마음가짐이 너를 진짜 부자로 만들어줄 첫걸음이 될 테니까. 푼돈이 목돈 된다는 말, 잊지 마.",
  "재물운은 쫓아갈수록 멀어지는 습성이 있어. 너무 조급해하지 말고 네가 세상에 어떤 가치를 줄 수 있을지 먼저 고민해봐. 네가 사람들에게 필요한 존재가 되는 순간, 돈은 네가 부르지 않아도 제 발로 너를 찾아올 거야. 마음을 조금 비워야 비로소 새로운 기회의 통로가 보이기 시작해.",
  "지금 하던 방식이 안 통한다면 과감하게 시야를 넓혀볼 때야. 항상 가던 길만 고집하지 말고 전혀 다른 분야나 새로운 재테크에도 관심을 가져봐. 예상치 못한 곳에 너를 위한 황금 열쇠가 숨겨져 있을지도 몰라. 변화를 두려워하지 않는 네 용기가 곧 너의 재산이 될 거야. 눈을 크게 떠봐!",
  "남들의 화려한 수익 인증이나 성공담에 흔들리지 마. 각자의 타이밍이 다르고 그들이 겪은 인고의 시간은 네 눈에 보이지 않잖아. 너는 지금 너만의 황금기를 차근차근 준비하고 있어. 타인의 성공을 시기하기보다 네 통장을 정성껏 가꾸는 일에만 집중해봐. 곧 네 차례가 올 거니까.",
  "최근에 손해를 봤거나 돈을 잃었다고 해서 너무 자책하지 마. 그건 네가 더 큰 손실을 막기 위해 미리 낸 일종의 '인생 수업료'라고 생각하자. 이미 지나간 것에 매몰되면 앞으로 올 이익도 놓치게 돼. 훌훌 털어버리고 다시 시작하는 사람에게 운은 다시 미소 짓는 법이야. 액땜했다고 치자!",
  "무작정 아끼고 안 쓰는 것만이 부자가 되는 길은 아냐. 지금은 네 자신에게 투자할 시기일지도 몰라. 새로운 기술을 배우거나 지식을 쌓는 건 절대 사라지지 않는 최고의 자산이거든. 네 머릿속에 든 지혜가 나중에 엄청난 이자가 되어 돌아올 거야. 너 자신을 가장 가치 있는 상품으로 만들어봐.",
  "돈을 쓸 때나 벌 때 네 직관을 한번 믿어봐. 남들이 다 좋다는 정보보다는 네 마음이 편안하게 느끼는 곳에 진짜 답이 있어. 욕심에 가려진 판단이 아니라 네 맑은 정신이 내리는 결정을 따라가봐. 그 끝에 분명 너를 활짝 웃게 할 경제적 보상이 기다리고 있을 거야. 네 촉은 생각보다 좋아.",
  "세상에 재물은 넘쳐나고 그중 일부는 반드시 네 몫으로 정해져 있어. '항상 부족하다'는 결핍의 생각보다는 '이미 풍요롭다'는 마음을 먼저 가져봐. 네가 풍요의 주파수를 맞출 때 세상의 재물들도 너에게 공명하며 다가올 거야. 넌 충분히 풍족하게 살 자격이 있는 사람이라는 걸 절대 잊지 마.",
  "몸이 보내는 작은 신호를 그냥 넘기지 마. 네 몸은 지금 너한테 '잠시 쉬어줘'라고 간절하게 말하고 있을지도 몰라. 쉬는 건 게으른 게 아니라 내일을 위한 가장 현명한 투자야. 지금 네 몸을 아껴주지 않으면 나중에 더 큰 비용을 치르게 될 수도 있어. 오늘만큼은 너 자신을 가장 귀하게 대접해줘.",
  "마음이 무거우면 몸도 천근만근 무거워지는 법이야. 지금 네가 느끼는 통증이나 불편함은 어쩌면 마음의 짐 때문일 수도 있어. 복잡한 생각은 잠시 내려놓고, 깊은 호흡에만 집중해봐. 마음이 맑아져야 몸의 기운도 자연스럽게 순환되는 거니까. 오늘 하루는 아무 걱정 없이 푹 자는 게 그 어떤 보약보다 나을 거야.",
  "너무 완벽하게 해내려고 애쓰지 마. 네 에너지는 무한한 게 아니거든. 지금은 배터리가 거의 다 된 상태니까 억지로 움직이려 하지 말고 충분히 충전할 시간을 줘. 네가 건강해야 네가 꿈꾸는 일들도, 사랑하는 사람들도 지킬 수 있는 거야. 오늘은 모든 걸 내려놓고 오로지 네 몸의 편안함만 생각하자.",
  "네가 먹는 게 곧 너 자신이 된다는 말, 들어봤지? 요즘 너무 자극적이고 차가운 것들로 네 몸을 괴롭히지는 않았니? 오늘 하루만이라도 따뜻한 물 한 잔, 정성 담긴 음식으로 네 속을 편안하게 달래줘. 작은 식습관 하나가 네 전체적인 생체 리듬을 바꾸고, 결국 운의 흐름까지 맑게 바꿔줄 거야.",
  "잠이 부족하면 운의 기운도 탁해지기 마련이야. 머릿속이 복잡해서 잠이 안 온다면, 그냥 눈을 감고 가만히 누워만 있어도 좋아. 네 뇌와 몸에 쉼을 주는 시간을 확보해봐. 깊은 숙면 뒤에 찾아오는 맑은 정신이 네가 고민하던 문제의 실마리를 찾아줄 거야. 오늘 밤엔 모든 고민을 꿈속으로 던져버려.",
  "운동을 꼭 거창하게 할 필요는 없어. 하루 10분만이라도 네 몸의 근육을 깨워주는 스트레칭을 해봐. 굳어있던 몸이 풀리면 막혀있던 기운도 뚫리고 새로운 행운이 들어올 자리가 생기거든. 네 몸은 네 영혼이 머무는 집이야. 네가 네 집을 깨끗하고 튼튼하게 가꿀 때, 네 인생의 운도 환하게 빛날 거야.",
  "최근에 스트레스 때문에 가슴이 답답하거나 목 뒤가 뻣뻣하지 않았어? 그건 네 몸이 보내는 긴급 구조 신호야. 잠시 하던 일을 멈추고 탁 트인 곳에서 맑은 공기를 마셔봐. 네 몸 안의 탁한 기운을 뱉어내고 신선한 에너지를 채워 넣어야 해. 네 건강이 곧 네 재산이라는 걸 한순간도 잊지 말아.",
  "건강은 건강할 때 지키라는 말이 뻔하게 들리겠지만, 그게 진리야. 지금 네가 무리해서 얻으려는 것들이 건강을 잃고 나서도 의미가 있을지 생각해봐. 조금 느려도 괜찮으니 네 페이스를 조절하면서 나아가자. 길게 보고 네 몸을 소중히 다루는 사람만이 결국 마지막에 활짝 웃는 승자가 될 수 있어.",
  "긍정적인 생각이 네 몸의 치유력을 높여준다는 걸 믿어봐. 아픈 곳이 있다면 자책하지 말고 '그동안 고생 많았어, 이제 괜찮아질 거야'라고 다독여주는 거야. 네 세포 하나하나가 네 목소리를 듣고 있거든. 스스로에게 건네는 따뜻한 말 한마디가 어떤 약보다 강력한 치유의 에너지를 만들어낼 거야.",
  "주변 환경을 한 번 정리해보는 건 어때? 네가 머무는 공간의 공기가 탁하면 네 건강 운세도 같이 가라앉거든. 창문을 열어 환기를 시키고 주변을 깔끔하게 치워봐. 맑은 환경에서 맑은 기운이 샘솟고, 그 기운이 네 몸을 더 생기 있게 만들어줄 거야. 작은 변화가 네 컨디션을 놀랍게 바꿔줄 거야."
  
];

const LUCKY_COLORS = ["보라색", "파란색", "녹색", "주황색", "분홍색", "노란색", "빨간색", "수색", "민트색", "자주색", "흰색", "검은색", "연두색", "연노랑색", "핑크색", "아이보리색", "그레이색", "금색", "은색", "딥그레이색", "버건디색", "딥블루색"];
const LUCKY_NUMBERS = [7, 3, 9, 5, 2, 8, 1, 6, 4, 11, 13, 17, 21, 27, 33, 34, 12, 23, 10, 41, 26, 44, 36, 28, 32, 20, 38, 40, 37];

// (컴포넌트 내부 생략...)

const activatePaidMode = useCallback((durationMin: number, menuId: number, menuName: string, price: number) => {
    const name = userProfile?.nickname || session.userName || '여행자';

    // 💰 1,000원 상품 (오늘의 기운) 처리 로직
    if (menuId === 0) {
      updateSession({
        isPaid: true,
        sessionExpiry: null,
        maxQuestions: 0,
        questionCount: 0,
        paymentPending: false,
      });
      setTimerExpired(false);
      addSystemMessage("💜 입금 확인 완료! 오늘의 기운을 읽어드릴게요.");
      toast.success("기운 분석을 시작합니다! ✨");

      const advice = ADVICE_MESSAGES[Math.floor(Math.random() * ADVICE_MESSAGES.length)];
      const color = LUCKY_COLORS[Math.floor(Math.random() * LUCKY_COLORS.length)];
      const number = LUCKY_NUMBERS[Math.floor(Math.random() * LUCKY_NUMBERS.length)];

      setTimeout(() => {
        addBotMessage(
          `✨ **${name}님을 위한 오늘의 기운 리포트**\n\n` +
          `🔮 **하울의 한 줄 조언**\n"${advice}"\n\n` +
          `🎨 **행운의 컬러**: ${color}\n` +
          `🔢 **행운의 숫자**: ${number}`
        );
      }, 800);

      setTimeout(() => {
        addBotMessage(`${name}님의 오늘 하루가 별처럼 빛나길 바랄게요. 내일 또 만나요! ✨`);
        updateSession({ isPaid: false, selectedMenu: null, freeReadingDone: false, questionCount: 0, sessionExpiry: null });
        setSessionTime(null);
        setShowReview(true);
      }, 3500);

      return;
    }

    // 🕒 [시간 계산 로직] DB 시간을 우선으로 가져옵니다.
    const product = dbProducts.find(p => p.menu_id === menuId);
    const finalDuration = product?.duration_minutes || durationMin || 30;

    updateSession({
      isPaid: true,
      sessionExpiry: Date.now() + (finalDuration * 60 * 1000), 
      maxQuestions: menuId === 16 ? 3 : 1,
      questionCount: 0,
      paymentPending: false,
    });

    setTimerExpired(false);
    addSystemMessage(`💜 결제가 승인되었습니다! ${finalDuration}분 동안 심층 리딩을 시작합니다.`);
    toast.success("입금 확인 완료! 상담을 이어갑니다 ✨");

    setTimeout(() => {
      const welcomeGuide = MENU_WELCOME_GUIDES[menuId];
      const currentName = session.userName || userProfile?.nickname || '';
      addBotMessage(welcomeGuide || `${currentName}님, 결제가 확인됐어! 이제 심층 리딩을 시작할게 ✨ 궁금한 것을 말씀해줘!`);
    }, 800);
  }, [session, userProfile, updateSession, addSystemMessage, addBotMessage, setShowReview, dbProducts]);

  // ✨ 여기까지가 activatePaidMode 끝입니다! 이 바로 밑에 getDbPrice가 오면 됩니다.

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

    if (session.isPaid && session.selectedMenu && session.selectedMenu.id === 0) {
      addBotMessage("오늘의 기운을 모두 읽어드렸어요! 내일도 좋은 하루 되세요 ✨");
      updateSession({ isPaid: false, selectedMenu: null, freeReadingDone: false, questionCount: 0, sessionExpiry: null });
      setSessionTime(null);
      setShowReview(true);
      return;
    }

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
      addBotMessage('이제 이야기를 시작해보자, 무슨이야기 할까? ✨');
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

 const handleMenuSelect = async (menu: Menu) => {
    setIsMenuOpen(false);

    const counselor = getCounselorForMenu(menu.id);
    const roomId = `room_${counselor.id}_${userProfile?.id || 'guest'}`;

    setMessages([]); 
    greetingSent.current = false; 

    const dbProduct = dbProducts.find(p => p.menu_id === menu.id);
    const actualMenu = dbProduct ? { ...menu, price: dbProduct.price, name: dbProduct.name } : menu;
    const durationMin = dbProduct?.duration_minutes || 30; // 🕒 DB 설정 시간 가져오기

    updateSession({
      selectedMenu: actualMenu,
      freeReadingDone: false,
      questionCount: 0,
      userName: session.userName || userProfile?.nickname || '',
      roomId, 
      counselorId: counselor.id,
    });

    // ✨ [승하님을 위한 편의 기능] 테스트 모드면 그냥 바로 통과!
    if (loadSettings().testMode) {
      activatePaidMode(durationMin, menu.id, actualMenu.name, actualMenu.price);
      addSystemMessage(`🧪 테스트 모드: ${durationMin}분 상담실 입장 완료!`);
      
      setTimeout(() => {
        const welcomeGuide = MENU_WELCOME_GUIDES[menu.id];
        addBotMessage(welcomeGuide || `${actualMenu.name} 리딩을 시작할게! ✨`);
      }, 800);
      return; // 👈 테스트 모드면 여기서 끝! 결제창 안 띄움.
    }

    // --- 여기부터는 일반 사용자(유료) 로직 ---
    if (menu.id === 16) {
      setShowPremiumForm(true);
    } else {
      setShowPayment(true);
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

  const handleExitChat = async (deleteChat: boolean) => {
 setShowExitModal(false);

    if (deleteChat) {
      // 🗑️ 대화 삭제를 선택했을 때만 실행
      await supabase.from('messages').delete().eq('session_id', session.dbSessionId);
      addSystemMessage("대화 내용이 삭제되었습니다.");
      
      // 삭제 시에는 세션만 새로 생성 (로그인은 유지됨)
      const newSessionId = `session_${Date.now()}_${Math.random()}`;
      localStorage.setItem('howl_session_id', newSessionId);
      sessionIdRef.current = newSessionId;
      resetSession();
    }

    // ✨ 핵심: 로그아웃(removeItem, setUserProfile) 코드를 삭제했습니다.
    // 이제 로그인 상태 그대로 메인 화면으로 이동합니다.
    setView('landing');
    toast.info("상담실을 잠시 나갑니다 ✨");
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

setView('landing');
  };

// ✨ 로그인 상태를 확인해서 메인으로 보낼지, 로그인창으로 보낼지 결정합니다.
  const handleStartChat = (menuId?: number, counselorId?: string) => {
    // 🔍 핵심: userProfile이 있거나 로컬스토리지에 아이디가 저장되어 있다면 "이미 로그인된 상태"입니다.
    const isLoggedIn = !!userProfile || !!localStorage.getItem('howl_profile_id');

    if (!isLoggedIn) {
      // 로그인 안 됐을 때만 번호 입력창(auth)으로 보냄
      setView('auth');
    } else {
      // 이미 로그인 됐다면 바로 채팅창(chat)으로 보냄!
      setView('chat');
      
      if (counselorId) {
        updateSession({ counselorId });
      }

      if (menuId !== undefined) {
        const menu = MENUS.find(m => m.id === menuId);
        if (menu) {
          const finalCounselorId = counselorId || getCounselorForMenu(menu.id).id;
          updateSession({ counselorId: finalCounselorId });
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

  // ✨ selectedMenu가 있으면 메뉴 기반, 없으면 counselorId로 상담사 찾기
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
          <MenuGrid onSelect={handleMenuSelect} onClose={() => setIsMenuOpen(false)} counselorId={currentCounselor?.id} />
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

     {/* ✨ 수정된 리뷰 모달 부분: 프리미엄 메뉴일 때만 리포트를 띄웁니다 */}
{showReview && userProfile && session.dbSessionId && session.selectedMenu && (
  <ReviewModal
    sessionId={session.dbSessionId}
    profileId={userProfile.id}
    userName={userProfile.nickname}
    menuName={session.selectedMenu.name}
    paymentPrice={getDbPrice(session.selectedMenu.id)}
    onClose={() => {
      setShowReview(false);
      // 💎 메뉴 ID가 16(프리미엄 종합분석)일 때만 리포트 창을 엽니다.
      if (session.selectedMenu?.id === 16) {
        setShowPremiumReport(true);
      } else {
        // 일반 메뉴는 리포트 없이 그냥 종료 (필요시 알림창 추가 가능)
        toast.success("상담이 종료되었습니다. 또 놀러오세요! ✨");
      }
    }}
  />
)}

{/* 📄 리포트 창에 대화 내용(messages)을 확실히 넘겨줍니다 */}
{showPremiumReport && (
  <PremiumReport
    counselorName={currentCounselor?.name || ''}
    menuName={session.selectedMenu?.name || ''}
    userName={userProfile?.nickname || ''}
    chatMessages={messages} // 👈 이 messages가 있어야 리포트에 글자가 나옵니다!
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
