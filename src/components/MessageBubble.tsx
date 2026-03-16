import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/hooks/useChat';
import howlProfile from '@/assets/howl-profile.png';

interface MessageBubbleProps {
  message: ChatMessage;
}

function StreamingText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed('');
    const interval = setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        clearInterval(interval);
      } else {
        setDisplayed(text.slice(0, indexRef.current));
      }
    }, 18);
    return () => clearInterval(interval);
  }, [text]);

  return <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{displayed}</p>;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const { role, content, image, isNew } = message;

  if (role === 'system') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center my-3"
      >
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground glass px-4 py-1.5 rounded-full">
          ✨ {content}
        </span>
      </motion.div>
    );
  }

  const isBot = role === 'bot';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`flex gap-2 ${isBot ? 'justify-start' : 'justify-end'}`}
    >
      {isBot && (
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-1 outline outline-1 outline-white/40 outline-offset-[-1px]">
          <img src={howlProfile} alt="하울" className="w-full h-full object-cover" />
        </div>
      )}
      <div
        className={`max-w-[78%] p-3.5 rounded-2xl shadow-sm ${
          isBot
            ? 'glass glow-border rounded-tl-sm'
            : 'bg-primary text-primary-foreground rounded-tr-sm shadow-lg'
        }`}
      >
        {image && (
          <div className="mb-2 rounded-xl overflow-hidden outline outline-1 outline-white/40 outline-offset-[-1px]">
            <img src={image} alt="업로드 이미지" className="w-full max-h-48 object-cover" />
          </div>
        )}
        {isBot && isNew ? (
          <StreamingText text={content} />
        ) : (
          <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{content}</p>
        )}
      </div>
    </motion.div>
  );
}
