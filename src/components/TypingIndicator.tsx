import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import howlProfile from '@/assets/howl-profile.png';

const MYSTICAL_MESSAGES = [
  "하울이 너의 주파수를 맞추는 중...",
  "천상계의 기록을 살피는 중...",
  "별의 언어를 해독하는 중...",
  "기운의 흐름을 읽는 중...",
  "운명의 실타래를 풀어보는 중...",
];

export default function TypingIndicator() {
  const [msgIndex, setMsgIndex] = useState(() => Math.floor(Math.random() * MYSTICAL_MESSAGES.length));

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % MYSTICAL_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-2 justify-start">
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-1 outline outline-1 outline-white/40 outline-offset-[-1px]">
        <img src={howlProfile} alt="하울" className="w-full h-full object-cover" />
      </div>
      <div className="glass glow-border rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1.5 mb-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary/50"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="text-[10px] text-muted-foreground"
          >
            {MYSTICAL_MESSAGES[msgIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
