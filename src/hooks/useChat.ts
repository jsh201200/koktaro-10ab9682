import { useState, useCallback, useRef } from 'react';
import { Menu } from '@/data/menus';

export interface ChatMessage {
  id: string;
  role: 'bot' | 'user' | 'system';
  content: string;
  timestamp: number;
  image?: string;
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

  const addMessage = useCallback((role: ChatMessage['role'], content: string, image?: string) => {
    const msg: ChatMessage = { id: genId(), role, content, timestamp: Date.now(), image };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  const addBotMessage = useCallback((content: string) => addMessage('bot', content), [addMessage]);
  const addUserMessage = useCallback((content: string, image?: string) => addMessage('user', content, image), [addMessage]);
  const addSystemMessage = useCallback((content: string) => addMessage('system', content), [addMessage]);

  const updateSession = useCallback((updates: Partial<SessionState>) => {
    setSession(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSession = useCallback(() => {
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
