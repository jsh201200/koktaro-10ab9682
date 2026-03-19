import howlProfile from '@/assets/howl-profile.png';
import { ArrowLeft } from 'lucide-react';

interface ChatHeaderProps {
  sessionTime: number | null;
  counselorName?: string;
  counselorImage?: string;
  onBack?: () => void;
}

export default function ChatHeader({ sessionTime, counselorName, counselorImage, onBack }: ChatHeaderProps) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <header className="fixed top-0 w-full z-50 glass px-4 py-3 sm:px-6">
      <div className="max-w-2xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1 rounded-lg hover:bg-muted/50 transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          )}
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg ring-1 ring-primary/20">
            <img src={counselorImage || howlProfile} alt="상담사" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight text-foreground">
              {counselorName || '콕타로'}
            </h1>
            <p className="text-[10px] text-muted-foreground">
              {counselorName ? '상담 진행 중' : 'KOK TAROT'}
            </p>
          </div>
        </div>
        {sessionTime !== null && sessionTime > 0 && (
          <div className="text-xs font-mono glass-strong px-3 py-1.5 rounded-full text-primary font-semibold">
            ⏳ {formatTime(sessionTime)}
          </div>
        )}
      </div>
    </header>
  );
}
