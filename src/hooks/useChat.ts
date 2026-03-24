import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Menu } from '@/data/menus';

export interface ChatMessage {
  id: string;
  role: 'bot' | 'user' | 'system';
  content: string;
  timestamp: number;
  image?: string;
  isNew?: boolean;
}

export interface SessionState {
  userName: string;
  selectedMenu: Menu | null;
  isPaid: boolean;
  freeReadingDone: boolean;
  questionCount: number;
  maxQuestions: number;
  sessionExpiry: number | null;
  paymentPending: boolean;
  imageFailCount: number;
  dbSessionId: string | null;
  roomId?: string;
  counselorId?: string;
}

const INITIAL_SESSION: SessionState = {
  userName: '',
  selectedMenu: null,
  isPaid: false,
  freeReadingDone: false,
  questionCount: 0,
  maxQuestions: 1,
  sessionExpiry: null,
  paymentPending: false,
  imageFailCount: 0,
  dbSessionId: null,
  roomId: undefined,
  counselorId: undefined,
};

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [session, setSession] = useState<SessionState>(INITIAL_SESSION);
  const [isTyping, setIsTyping] = useState(false);
  const idCounter = useRef(0);

  const genId = () => {
    idCounter.current += 1;
    return `msg-${Date.now()}-${idCounter.current}`;
  };

  // 1️⃣ [초기 로드] 세션 아이디 확인 및 최초 세션 생성
  useEffect(() => {
    const initSession = async () => {
      const existingId = localStorage.getItem('howl_session_id');
      
      if (existingId) {
        const { data } = await supabase.from('chat_sessions').select('*').eq('id', existingId).single();
        if (data) {
          setSession(prev => ({
            ...prev,
            dbSessionId: data.id,
            userName: data.user_nickname || '',
            isPaid: data.is_paid || false,
            roomId: data.room_id || undefined,
          }));
          return;
        }
      }
      
      const { data: newSession } = await supabase
        .from('chat_sessions')
        .insert({
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
        })
        .select()
        .single();
      
      if (newSession) {
        localStorage.setItem('howl_session_id', newSession.id);
        setSession(prev => ({ ...prev, dbSessionId: newSession.id }));
      }
    };

    const recordVisit = async () => {
      const sessionId = localStorage.getItem('howl_session_id');
      await supabase.from('page_visits').insert({
        session_id: sessionId,
        path: window.location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
      });
    };

    initSession().then(() => recordVisit());
  }, []);

  // 2️⃣ [핵심 수정] 방(roomId)이 바뀔 때마다 해당 상담사와의 메시지만 새로 불러오기
  useEffect(() => {
    const fetchRoomMessages = async () => {
      if (!session.dbSessionId || !session.roomId) return;

      // 상담사가 바뀌면 일단 화면을 비웁니다.
      setMessages([]);

      const { data: history } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', session.dbSessionId)
        .eq('room_id', session.roomId) // ✨ 현재 선택된 상담사의 방 번호로만 필터링!
        .order('created_at', { ascending: true });
      
      if (history && history.length > 0) {
        const msgs: ChatMessage[] = history.map(h => ({
          id: h.id,
          role: h.role as ChatMessage['role'],
          content: h.content,
          timestamp: new Date(h.created_at || '').getTime(),
          image: h.image_url || undefined,
        }));
        setMessages(msgs);
      }
    };

    fetchRoomMessages();
  }, [session.roomId, session.dbSessionId]); // 👈 방 번호가 바뀌면 이 함수가 실행됩니다.

  const saveChatMessage = useCallback(async (role: string, content: string, imageUrl?: string) => {
    if (!session.dbSessionId) return;
    
    await supabase.from('messages').insert({
      session_id: session.dbSessionId,
      room_id: session.roomId || null, // ✨ 저장할 때도 어떤 상담사 방인지 기록!
      role,
      content,
      image_url: imageUrl || null,
    });
  }, [session.dbSessionId, session.roomId]);

  const addMessage = useCallback((role: ChatMessage['role'], content: string, image?: string) => {
    const msg: ChatMessage = { id: genId(), role, content, timestamp: Date.now(), image, isNew: role === 'bot' };
    setMessages(prev => {
      const updated = prev.map(m => m.isNew ? { ...m, isNew: false } : m);
      return [...updated, msg];
    });
    return msg;
  }, []);

  const addBotMessage = useCallback((content: string) => {
    const msg = addMessage('bot', content);
    saveChatMessage('bot', content);
    return msg;
  }, [addMessage, saveChatMessage]);

  const addUserMessage = useCallback((content: string, image?: string) => {
    const msg = addMessage('user', content, image);
    saveChatMessage('user', content, image);
    return msg;
  }, [addMessage, saveChatMessage]);

  const addSystemMessage = useCallback((content: string) => {
    const msg = addMessage('system', content);
    saveChatMessage('system', content);
    return msg;
  }, [addMessage, saveChatMessage]);

  const updateSession = useCallback((updates: Partial<SessionState>) => {
    setSession(prev => {
      const next = { ...prev, ...updates };
      
      if (next.dbSessionId && (updates.userName !== undefined || updates.isPaid !== undefined || updates.selectedMenu !== undefined || updates.roomId !== undefined)) {
        supabase.from('chat_sessions').update({
          user_nickname: next.userName || null,
          is_paid: next.isPaid,
          selected_menu_id: next.selectedMenu?.id ?? null,
          room_id: next.roomId || null,
        }).eq('id', next.dbSessionId).then(() => {});
      }
      return next;
    });
  }, []);

  const resetSession = useCallback(() => {
    localStorage.removeItem('howl_session_id');
    setSession(INITIAL_SESSION);
    setMessages([]);
  }, []);

  return {
    messages,
    setMessages,
    session,
    isTyping,
    setIsTyping,
    addBotMessage,
    addUserMessage,
    addSystemMessage,
    updateSession,
    resetSession,
  };
}
