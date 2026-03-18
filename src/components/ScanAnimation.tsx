import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface ScanAnimationProps {
  image: string;
  onComplete: () => void;
}

const SCAN_LOGS = [
  '얼굴 윤곽 인식 중...',
  '골격 구조 분석...',
  '피부 톤 에너지 스캔...',
  '관상 데이터 매핑...',
  '운세 패턴 디코딩...',
  '✨ 분석 완료!',
];

export default function ScanAnimation({ image, onComplete }: ScanAnimationProps) {
  const [logIndex, setLogIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLogIndex(prev => {
        if (prev >= SCAN_LOGS.length - 1) {
          clearInterval(timer);
          setTimeout(onComplete, 500);
          return prev;
        }
        return prev + 1;
      });
    }, 500);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="relative rounded-2xl overflow-hidden mb-3">
      <img src={image} alt="분석 중" className="w-full max-h-48 object-cover" />
      
      {/* Scan line */}
      <motion.div
        animate={{ y: ['0%', '100%', '0%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_10px_hsl(var(--primary))]"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-foreground/40 flex items-end p-3">
        <div className="space-y-0.5">
          {SCAN_LOGS.slice(0, logIndex + 1).map((log, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[10px] font-mono text-primary-foreground"
            >
              {'>'} {log}
            </motion.p>
          ))}
        </div>
      </div>

      {/* Corner brackets */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary" />
    </div>
  );
}
