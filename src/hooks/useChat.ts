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
          // ✨ [Fix 1] counselorId, roomId, selectedMenuId 모두 복구
          setSession(prev => ({
            ...prev,
            dbSessionId: data.id,
            userName: data.user_nickname || '',
            isPaid: data.is_paid || false,
            roomId: data.room_id || undefined,
            counselorId: data.counselor_id || undefined,
            selectedMenu: data.selected_menu_id ? { id: data.selected_menu_id } as Menu : null,
          }));
          console.log('✅ [세션 복구 완료]', {
            sessionId: data.id,
            counselorId: data.counselor_id,
            roomId: data.room_id,
          });
          return;
        }
      }
      
      // 새 세션 생성
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
        console.log('✅ [새 세션 생성]', newSession.id);
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

  // 2️⃣ [핵심 수정] 방(roomId)이 바뀔 때 이전 잔상을 '즉시' 지우고 해당 상담사 대화만 불러오기
  useEffect(() => {
    const fetchRoomMessages = async () => {
      if (!session.dbSessionId || !session.roomId) {
        // ✨ [핵심] roomId가 없으면 화면을 즉시 비움 (이안의 잔상 제거)
        setMessages([]);
        return;
      }

      // ✨ [핵심] 방을 옮기는 즉시 화면을 비워야 이전 상담사 대화가 남지 않음
      setMessages([]);

      const { data: history } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', session.dbSessionId)
        .eq('room_id', session.roomId) // 🎯 현재 상담사의 고유 roomId로만 필터링!
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
        console.log(`✅ [${session.roomId}에서 ${msgs.length}개 메시지 로드]`);
      }
    };

    fetchRoomMessages();
  }, [session.roomId, session.dbSessionId]); // roomId가 바뀌면 즉시 실행!

  // 3️⃣ [핵심 수정] 메시지 저장 시 현재 roomId를 '확실하게' 낚아채서 저장
  const saveChatMessage = useCallback(async (role: string, content: string, imageUrl?: string) => {
    if (!session.dbSessionId || !session.roomId) {
      console.warn('⚠️ roomId 없어서 메시지 저장 안 함', { sessionId: session.dbSessionId, roomId: session.roomId });
      return;
    }
    
    await supabase.from('messages').insert({
      session_id: session.dbSessionId,
      room_id: session.roomId, // ✨ 현재 세션에 찍힌 그 상담사 방으로 저장!
      role,
      content,
      image_url: imageUrl || null,
    });
  }, [session.dbSessionId, session.roomId]); // session.roomId를 감시해서 최신화!

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

  const updateSession = useCallback((updates: Partial<SessionState>) => {
    setSession(prev => {
      const next = { ...prev, ...updates };
      
      // ✨ [핵심 수정] 세션 업데이트 시 DB에도 즉시 동기화합니다.
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
        
        // 🚪 [필수] 방 번호 업데이트
        if (updates.roomId !== undefined) {
          updatePayload.room_id = next.roomId || null;
          console.log('💾 [DB 저장] roomId:', next.roomId);
        }
        
        // 👤 [필수] 상담사 ID 업데이트
        if (updates.counselorId !== undefined) {
          updatePayload.counselor_id = next.counselorId || null;
          console.log('💾 [DB 저장] counselorId:', next.counselorId);
        }
        
        if (Object.keys(updatePayload).length > 0) {
          console.log('🔄 [DB 동기화]', {
            sessionId: next.dbSessionId,
            payload: updatePayload,
          });
          
          supabase
            .from('chat_sessions')
            .update(updatePayload)
            .eq('id', next.dbSessionId)
            .then(({ data, error }) => {
              if (error) {
                console.error('❌ [DB 업데이트 실패]', error);
              } else {
                console.log('✅ [DB 업데이트 성공]');
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
