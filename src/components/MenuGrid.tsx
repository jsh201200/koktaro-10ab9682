import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { MENUS, CATEGORY_LABELS, Menu } from '@/data/menus';
import { X } from 'lucide-react';

interface MenuGridProps {
  onSelect: (menu: Menu) => void;
  onClose: () => void;
}

function FlipCard({ menu, onSelect }: { menu: Menu; onSelect: (m: Menu) => void }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="h-44 perspective-1000 cursor-pointer"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative w-full h-full transform-style-3d"
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden glass glow-border rounded-2xl p-3 flex flex-col items-center justify-center text-center">
          <span className="text-2xl mb-1.5">{menu.icon}</span>
          <span className="text-[9px] text-primary font-bold tracking-wider mb-0.5">
            MENU {menu.id}
          </span>
          <h3 className="font-semibold text-sm text-foreground">{menu.name}</h3>
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-tight px-1">{menu.desc}</p>
        </div>

        {/* Back */}
        <div className="absolute inset-0 backface-hidden rotateY-180 glass-strong rounded-2xl p-3 flex flex-col items-center justify-center text-center border border-primary/20">
          <span className="text-[9px] text-muted-foreground mb-1">{menu.categoryName}</span>
          <span className="text-lg font-bold text-primary mb-1">
            {menu.price.toLocaleString()}원
          </span>
          <p className="text-[10px] text-muted-foreground mb-3 px-2 leading-tight">{menu.detailDesc}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(menu);
            }}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs rounded-full font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            상담 시작하기
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function MenuGrid({ onSelect, onClose }: MenuGridProps) {
  const categories = ['A', 'B', 'C', 'D'] as const;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] aurora-bg overflow-y-auto scrollbar-hide"
    >
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif text-xl font-bold text-secondary-foreground">✨ 상담 메뉴</h2>
          <button
            onClick={onClose}
            className="glass rounded-full p-2 hover:bg-white/60 transition-colors active:scale-95"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {categories.map((cat) => {
          const items = MENUS.filter((m) => m.category === cat);
          return (
            <div key={cat} className="mb-6">
              <h3 className="text-xs font-bold text-primary tracking-wider uppercase mb-3 pl-1">
                {CATEGORY_LABELS[cat]}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {items.map((menu) => (
                  <FlipCard key={menu.id} menu={menu} onSelect={onSelect} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
