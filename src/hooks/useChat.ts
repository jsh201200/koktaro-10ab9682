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
  roomId?: string; // ✨ room_id 추가
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
  roomId: undefined, // ✨ 초기값
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

  // Create DB session on first load
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
            roomId: data.room_id || undefined, // ✨ DB에서 room_id 로드
          }));
          
          // ✨ room_id별로 메시지 필터링해서 로드
          const roomId = data.room_id;
          const { data: history } = await supabase
            .from('messages')
            .select('*')
            .eq('session_id', data.id)
            .eq('room_id', roomId || null) // room_id로 필터링
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
          return;
        }
      }
      
      // Create new session
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

  const saveChatMessage = useCallback(async (role: string, content: string, imageUrl?: string) => {
    if (!session.dbSessionId) return;
    
    // ✨ room_id와 함께 저장
    await supabase.from('messages').insert({
      session_id: session.dbSessionId,
      room_id: session.roomId || null, // room_id 포함
      role,
      content,
      image_url: imageUrl || null,
    });
  }, [session.dbSessionId, session.roomId]); // ✨ roomId 의존성 추가

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
      
      // ✨ room_id도 DB에 저장
      if (next.dbSessionId && (updates.userName !== undefined || updates.isPaid !== undefined || updates.selectedMenu !== undefined || updates.roomId !== undefined)) {
        supabase.from('chat_sessions').update({
          user_nickname: next.userName || null,
          is_paid: next.isPaid,
          selected_menu_id: next.selectedMenu?.id ?? null,
          room_id: next.roomId || null, // ✨ room_id 저장
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
