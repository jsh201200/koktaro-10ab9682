import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { MENUS, CATEGORY_LABELS, Menu } from '@/data/menus';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MenuGridProps {
  onSelect: (menu: Menu) => void;
  onClose: () => void;
}

interface MenuWithPrice extends Menu {
  price: number;
  name: string;
}

// 🎴 타로 카드 애니메이션 컴포넌트
function TaroCardAnimation({ onSelect }: { onSelect: (m: MenuWithPrice) => void }) {
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const cards = Array.from({ length: 12 }, (_, i) => i);

  const handleCardClick = (index: number) => {
    if (selectedCards.length < 3 && !selectedCards.includes(index)) {
      setSelectedCards([...selectedCards, index]);
    }
    if (selectedCards.length === 2) {
      setTimeout(() => setIsComplete(true), 800);
    }
  };

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2 }} className="text-4xl mb-4 inline-block">
          🔮
        </motion.div>
        <p className="text-sm text-foreground font-semibold mb-4">당신의 운명을 읽어줄게요...</p>
        <button
          onClick={() => {
            const taroMenu = MENUS.find(m => m.id === 2) as MenuWithPrice;
            if (taroMenu) onSelect({ ...taroMenu, price: taroMenu.price });
          }}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-bold text-sm shadow-lg hover:shadow-xl transition-all"
        >
          타로 상담 시작하기
        </button>
      </motion.div>
    );
  }

  return (
    <div className="py-6">
      <p className="text-center text-sm text-muted-foreground mb-6">카드를 {3 - selectedCards.length}장 더 선택해주세요 ✨</p>
      
      {/* 부채꼴 카드 펼치기 */}
      <div className="relative h-64 flex items-center justify-center">
        {cards.map((i) => {
          const angle = (i - 5.5) * 15; // 중심 기준 각도
          const radius = 120; // 반경
          const x = Math.sin((angle * Math.PI) / 180) * radius;
          const y = -Math.cos((angle * Math.PI) / 180) * radius + 60;

          const isSelected = selectedCards.includes(i);

          return (
            <motion.div
              key={i}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
              animate={{
                x: x,
                y: y,
                rotate: angle,
                opacity: 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 20,
                delay: i * 0.05,
              }}
              onClick={() => handleCardClick(i)}
              className={`absolute w-16 h-24 cursor-pointer transition-all ${
                isSelected ? 'z-50' : 'hover:z-40'
              }`}
            >
              <motion.div
                animate={{
                  y: isSelected ? -40 : 0,
                  scale: isSelected ? 1.1 : 1,
                  rotateX: isSelected ? 180 : 0,
                }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="relative w-full h-full"
              >
                {/* 카드 뒷면 */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg shadow-lg border-2 border-purple-300 flex items-center justify-center">
                  <span className="text-2xl">🔮</span>
                </div>

                {/* 카드 앞면 (뒤집혔을 때) */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-100 to-pink-100 rounded-lg shadow-lg border-2 border-pink-300 flex items-center justify-center rotateX-180">
                  <span className="text-3xl">{['🌙', '⭐', '✨', '🌟', '💫', '🌠', '🎇', '🎆', '✨', '🌌', '🪐', '🔯'][i]}</span>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* 선택된 카드 표시 */}
      {selectedCards.length > 0 && (
        <div className="flex justify-center gap-3 mt-12">
          {selectedCards.map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-12 h-16 bg-gradient-to-br from-yellow-100 to-pink-100 rounded-lg shadow-md border border-pink-300 flex items-center justify-center text-xl"
            >
              {['🌙', '⭐', '✨', '🌟', '💫', '🌠', '🎇', '🎆', '✨', '🌌', '🪐', '🔯'][i]}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// 🪙 엽전 흔들기 애니메이션 컴포넌트
function CoinShakeAnimation({ onSelect }: { onSelect: (menuId: number) => void }) {
  const [isShaking, setIsShaking] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleShake = async () => {
    setIsShaking(true);
    setResult(null);

    // 엽전 흔들기 애니메이션
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 결과 도출 (3개 중 하나)
    const results = ['길함 ☀️', '중길함 🌤️', '흉함 ⛅'];
    const randomResult = results[Math.floor(Math.random() * results.length)];
    setResult(randomResult);

    setIsShaking(false);
  };

  if (result) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.8, repeat: 3 }}
          className="text-5xl mb-4"
        >
          🪙
        </motion.div>
        <p className="text-lg font-bold text-primary mb-4">{result}</p>
        <p className="text-sm text-muted-foreground mb-6">더 깊은 운세를 알고 싶으신가요?</p>
        <button
          onClick={() => {
            // 사주/신점 중 하나 선택 (사주 = id 3)
            onSelect(3);
          }}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-bold text-sm shadow-lg hover:shadow-xl transition-all"
        >
          사주 상담 시작하기
        </button>
      </motion.div>
    );
  }

  return (
    <div className="text-center py-8">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleShake}
        disabled={isShaking}
        className="mb-6"
      >
        <motion.div
          animate={isShaking ? { rotate: 360, y: [0, -10, 0] } : {}}
          transition={isShaking ? { duration: 0.1, repeat: Infinity } : {}}
          className="text-6xl cursor-pointer"
        >
          🪙
        </motion.div>
      </motion.button>

      <p className="text-sm text-muted-foreground mb-4">
        {isShaking ? '엽전을 흔드는 중...' : '엽전을 흔들어 운세를 봐보세요'}
      </p>

      {isShaking && (
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="text-xs text-primary font-semibold"
        >
          짤랑~ 짤랑~ ✨
        </motion.p>
      )}
    </div>
  );
}

function FlipCard({ menu, onSelect }: { menu: MenuWithPrice; onSelect: (m: MenuWithPrice) => void }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  const isSnack = menu.isSnack;
  const isTaro = menu.id === 2; // 타로
  const isCoinToss = menu.id === 3 || menu.id === 4; // 사주/신점

  // 타로 또는 엽전 애니메이션 클릭 시
  const handleAnimationClick = () => {
    setShowAnimation(true);
    setIsFlipped(false);
  };

  if (showAnimation) {
    return (
      <div className="perspective-1000 h-44">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="relative w-full h-full"
        >
          <motion.button
            onClick={() => setShowAnimation(false)}
            className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </motion.button>

          {isTaro && (
            <TaroCardAnimation
              onSelect={(m) => {
                onSelect(m);
              }}
            />
          )}

          {isCoinToss && (
            <CoinShakeAnimation
              onSelect={(menuId) => {
                const selectedMenu = MENUS.find(m => m.id === menuId) as MenuWithPrice;
                if (selectedMenu) {
                  onSelect({ ...selectedMenu, price: selectedMenu.price });
                }
              }}
            />
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className={`perspective-1000 cursor-pointer ${isSnack ? 'h-36' : 'h-44'}`}
      onMouseEnter={() => !isTaro && !isCoinToss && setIsFlipped(true)}
      onMouseLeave={() => !isTaro && !isCoinToss && setIsFlipped(false)}
      onClick={() => {
        if (isTaro || isCoinToss) {
          handleAnimationClick();
        } else {
          setIsFlipped(!isFlipped);
        }
      }}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative w-full h-full transform-style-3d"
      >
        {/* Front */}
        <div
          className={`absolute inset-0 backface-hidden rounded-2xl p-3 flex flex-col items-center justify-center text-center ${
            isSnack
              ? 'bg-gradient-to-br from-yellow-50/80 to-pink-50/80 border-2 border-dashed border-primary/30 shadow-[0_0_12px_rgba(var(--primary-rgb),0.15)]'
              : 'glass glow-border'
          }`}
        >
          <span className={`mb-1.5 ${isSnack ? 'text-3xl animate-bounce' : 'text-2xl'} ${(isTaro || isCoinToss) && 'animate-pulse'}`}>
            {menu.icon}
          </span>
          {!isSnack && (
            <span className="text-[9px] text-primary font-bold tracking-wider mb-0.5">
              MENU {menu.id}
            </span>
          )}
          {isSnack && (
            <span className="text-[9px] text-primary font-bold tracking-wider mb-0.5 bg-primary/10 px-2 py-0.5 rounded-full">
              🌟 NEW
            </span>
          )}
          <h3 className={`font-semibold text-foreground ${isSnack ? 'text-xs' : 'text-sm'}`}>{menu.name}</h3>
          <p className="text-[10px] text-muted-foreground mt-1 leading-tight px-1">{menu.desc}</p>
          {(isTaro || isCoinToss) && (
            <p className="text-[10px] text-primary font-semibold mt-1.5 animate-bounce">클릭해서 체험하기 ✨</p>
          )}
          {isSnack && (
            <span className="mt-1 text-[10px] font-bold text-primary">{menu.price.toLocaleString()}원</span>
          )}
        </div>

        {/* Back */}
        <div
          className={`absolute inset-0 backface-hidden rotateY-180 rounded-2xl p-3 flex flex-col items-center justify-center text-center border border-primary/20 ${
            isSnack ? 'bg-gradient-to-br from-primary/10 to-pink-100/80' : 'glass-strong'
          }`}
        >
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
  const [menusWithPrices, setMenusWithPrices] = useState<MenuWithPrice[]>([]);
  const categories = ['A', 'B', 'C', 'D'] as const;

  // ✨ DB에서 실시간 가격 fetch
  useEffect(() => {
    const loadMenusWithPrices = async () => {
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('enabled', true)
        .order('sort_order');

      if (products) {
        // MENUS와 products 합치기 (DB 가격으로 업데이트)
        const merged = MENUS.map(menu => {
          const product = products.find((p: any) => p.menu_id === menu.id);
          return {
            ...menu,
            name: product?.name || menu.name,
            price: product?.price || menu.price,
          } as MenuWithPrice;
        });
        setMenusWithPrices(merged);
      } else {
        // DB 없으면 기본 MENUS 사용
        setMenusWithPrices(MENUS.map(m => ({ ...m, price: m.price } as MenuWithPrice)));
      }
    };

    loadMenusWithPrices();

    // ✨ 실시간 구독 (DB 변경 시 자동 업데이트)
    const channel = supabase
      .channel('products-changes-menu')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          loadMenusWithPrices(); // DB 변경되면 다시 로드
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
          const items = menusWithPrices.filter((m) => m.category === cat);
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
