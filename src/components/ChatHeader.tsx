import howlProfile from '@/assets/howl-profile.png';

interface ChatHeaderProps {
  sessionTime: number | null;
}

export default function ChatHeader({ sessionTime }: ChatHeaderProps) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <header className="fixed top-0 w-full z-50 glass px-4 py-3 sm:px-6">
      <div className="max-w-2xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg outline outline-1 outline-white/40 outline-offset-[-1px]">
            <img src={howlProfile} alt="하울" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-serif text-lg font-bold tracking-tight text-secondary-foreground">
              하울의 챗봇상담소
            </h1>
            <p className="text-[10px] text-muted-foreground">천상계 점술 상담</p>
          </div>
        </div>
        {sessionTime !== null && (
          <div className="text-xs font-mono glass-strong px-3 py-1.5 rounded-full text-primary font-semibold">
            ⏳ {formatTime(sessionTime)}
          </div>
        )}
      </div>
    </header>
  );
}
