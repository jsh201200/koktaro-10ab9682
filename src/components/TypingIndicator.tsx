import { motion } from 'framer-motion';
import howlProfile from '@/assets/howl-profile.png';

export default function TypingIndicator() {
  return (
    <div className="flex gap-2 justify-start">
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-1 outline outline-1 outline-white/40 outline-offset-[-1px]">
        <img src={howlProfile} alt="하울" className="w-full h-full object-cover" />
      </div>
      <div className="glass glow-border rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary/50"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
