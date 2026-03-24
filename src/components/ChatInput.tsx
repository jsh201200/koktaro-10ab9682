import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Image, Menu as MenuIcon } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string, image?: string) => void;
  onMenuToggle: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, onMenuToggle, disabled, placeholder }: ChatInputProps) {
  const [text, setText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        onSend('사진을 보내드릴게요! ✨', base64);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed bottom-0 w-full p-3 z-50">
      <div className="max-w-2xl mx-auto space-y-2">
        <button
          onClick={onMenuToggle}
          className="w-full py-2.5 rounded-2xl glass glow-border text-primary font-semibold text-sm hover:bg-white/70 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <MenuIcon className="w-4 h-4" />
          메뉴 보기 ✨
        </button>
        <div className="relative">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="w-full p-3.5 pr-20 rounded-2xl glass-strong text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground"
            placeholder={placeholder || '콕콕에게 메시지 보내기...'}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              onClick={() => fileRef.current?.click()}
              className="p-2 rounded-full hover:bg-white/50 transition-colors text-muted-foreground hover:text-primary"
            >
              <Image className="w-4 h-4" />
            </button>
            <button
              onClick={handleSend}
              disabled={!text.trim() || disabled}
              className="p-2 rounded-full bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all active:scale-90 disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
        </div>
      </div>
    </div>
  );
}
