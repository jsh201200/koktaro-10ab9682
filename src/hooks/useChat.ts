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

  // FIX 1: 세션 초기화 시 counselorId 정규화
  const normalizeCounselorId = (id: string | null | undefined): string => {
    if (!id || typeof id !== 'string') return 'luna';
    const normalized = id.toLowerCase().trim();
    if (normalized === 'song') return 'songsengsang';
    const valid = ['ian', 'jihan', 'songsengsang', 'luna', 'suhyun', 'myunghwa'];
    return valid.includes(normalized) ? normalized : 'luna';
  };
  useEffect(() => {
    if (!session.dbSessionId) return;

    const channel = supabase
      .channel('session_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_sessions',
          filter: `id=eq.${session.dbSessionId}`,
        },
        (payload) => {
          // 관리자가 결제 승인(is_paid: true)을 하면 바로 상태 반영!
          if (payload.new.is_paid && !session.isPaid) {
            setSession(prev => ({ ...prev, isPaid: true }));
            addSystemMessage("🎉 입금이 확인되었습니다! 곧 상담이 시작됩니다.");
            console.log("결제 승인 실시간 감지 완료!");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.dbSessionId, session.isPaid, addSystemMessage]);

  useEffect(() => {
    const initSession = async () => {
      const existingId = localStorage.getItem('howl_session_id');
      
      if (existingId) {
        const { data } = await supabase.from('chat_sessions').select('*').eq('id', existingId).single();
        if (data) {
          const normalizedCounselorId = normalizeCounselorId(data.counselor_id);
          setSession(prev => ({
            ...prev,
            dbSessionId: data.id,
            userName: data.user_nickname || '',
            isPaid: data.is_paid || false,
            roomId: data.room_id || undefined,
            counselorId: normalizedCounselorId,
            selectedMenu: data.selected_menu_id ? { id: data.selected_menu_id } as Menu : null,
          }));
          console.log('세션 복구 완료', {
            sessionId: data.id,
            counselorId: normalizedCounselorId,
            roomId: data.room_id,
          });
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
        console.log('새 세션 생성', newSession.id);
      }
    };

    const recordVisit = async () => {
      const sessionId = localStorage.getItem('howl_session_id');
      if (!sessionId) return;
      await supabase.from('page_visits').insert({
        session_id: sessionId,
        path: window.location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
      });
    };

    initSession().then(() => recordVisit());
  }, []);

  // FIX 2: roomId 변경 시 메시지 즉시 로드 (다른 상담사 메시지 섞임 방지)
  useEffect(() => {
    const fetchRoomMessages = async () => {
      if (!session.dbSessionId || !session.roomId) {
        setMessages([]);
        return;
      }

      setMessages([]);

      const { data: history } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', session.dbSessionId)
        .eq('room_id', session.roomId)
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
        console.log(`${session.roomId}에서 ${msgs.length}개 메시지 로드`);
      }
    };

    fetchRoomMessages();
  }, [session.roomId, session.dbSessionId]);

  // FIX 3: 메시지 저장 시 roomId 확인
  const saveChatMessage = useCallback(async (role: string, content: string, imageUrl?: string) => {
    if (!session.dbSessionId || !session.roomId) {
      console.warn('roomId 없어서 메시지 저장 안 함', { sessionId: session.dbSessionId, roomId: session.roomId });
      return;
    }
    
    await supabase.from('messages').insert({
      session_id: session.dbSessionId,
      room_id: session.roomId,
      role,
      content,
      image_url: imageUrl || null,
    });
  }, [session.dbSessionId, session.roomId]);

  const addMessage = useCallback((role: ChatMessage['role'], content: string, image?: string) => {
    const msg: ChatMessage = {
      id: genId(),
      role,
      content,
      timestamp: Date.now(),
      image,
      isNew: role === 'bot'
    };
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

  // FIX 4: DB 동기화 시 counselorId 정규화
  const updateSession = useCallback((updates: Partial<SessionState>) => {
    setSession(prev => {
      const next = { ...prev, ...updates };
      
      if (next.dbSessionId) {
        const updatePayload: Record<string, any> = {};
        
        if (updates.userName !== undefined) {
          updatePayload.user_nickname = next.userName || null;
        }
        
        if (updates.isPaid !== undefined) {
          updatePayload.is_paid = next.isPaid;
        }
        
        if (updates.selectedMenu !== undefined) {
          updatePayload.selected_menu_id = next.selectedMenu?.id ?? null;
        }
        
        if (updates.roomId !== undefined) {
          updatePayload.room_id = next.roomId || null;
        }
        
        if (updates.counselorId !== undefined) {
          const normalizedId = normalizeCounselorId(updates.counselorId);
          updatePayload.counselor_id = normalizedId;
          console.log('DB 저장 - counselorId:', normalizedId);
        }
        
        if (Object.keys(updatePayload).length > 0) {
          console.log('DB 동기화', {
            sessionId: next.dbSessionId,
            payload: updatePayload,
          });
          
          supabase
            .from('chat_sessions')
            .update(updatePayload)
            .eq('id', next.dbSessionId)
            .then(({ error }) => {
              if (error) {
                console.error('DB 업데이트 실패', error);
              } else {
                console.log('DB 업데이트 성공');
              }
            });
        }
      }
      
      return next;
    });
  }, []);

  const resetSession = useCallback(() => {
    setMessages([]);
    setSession(INITIAL_SESSION);
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
