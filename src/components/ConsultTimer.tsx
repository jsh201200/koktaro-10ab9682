import { motion } from 'framer-motion';

interface ConsultTimerProps {
  seconds: number;
  onExtend: () => void;
  expired: boolean;
}

export default function ConsultTimer({ seconds, onExtend, expired }: ConsultTimerProps) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const isWarning = seconds <= 300 && seconds > 0;

  if (expired) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-14 z-40 mx-4 mb-2"
      >
        <div className="max-w-2xl mx-auto glass-strong rounded-2xl p-3 flex items-center justify-between glow-border border border-destructive/30">
          <div>
            <p className="text-xs font-bold text-destructive">⏰ 상담 시간이 종료되었습니다</p>
            <p className="text-[10px] text-muted-foreground">더 깊은 상담을 원하시면 연장해주세요</p>
          </div>
          <button
            onClick={onExtend}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            상담 연장
          </button>
        </div>
      </motion.div>
    );
  }

  if (seconds <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-14 z-40 mx-4 mb-2"
    >
      <div className={`max-w-2xl mx-auto glass-strong rounded-full px-4 py-2 flex items-center justify-center gap-2 ${isWarning ? 'border border-destructive/30 animate-pulse' : 'glow-border'}`}>
        <span className="text-xs">⏳</span>
        <span className={`text-sm font-mono font-bold ${isWarning ? 'text-destructive' : 'text-primary'}`}>
          {m}:{s.toString().padStart(2, '0')}
        </span>
        <span className="text-[10px] text-muted-foreground">남은 상담 시간</span>
      </div>
    </motion.div>
  );
}
