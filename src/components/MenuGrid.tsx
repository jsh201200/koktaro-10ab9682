import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { MENUS, CATEGORY_LABELS, Menu } from '@/data/menus';
import { COUNSELORS } from '@/data/counselors';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatElla } from '@/lib/ella';

interface MenuGridProps {
  onSelect: (menu: Menu) => void;
  onClose: () => void;
  counselorId?: string;
}

interface DbProduct {
  id: string;
  menu_id: number;
  name: string;
  icon: string;
  desc: string;
  detail_desc: string;
  price: number;
  duration_minutes: number;
  enabled: boolean;
  sort_order: number;
}

interface MenuWithPrice extends Menu {
  price: number;
  name: string;
}

function FlipCard({ menu, onSelect }: { menu: MenuWithPrice; onSelect: (m: MenuWithPrice) => void }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const isSnack = menu.isSnack;

  return (
    <div
      className={`perspective-1000 cursor-pointer ${isSnack ? 'h-36' : 'h-44'}`}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative w-full h-full transform-style-3d"
      >
        {/* Front - 앞면 (모든 카드 유리 스타일로 통일) */}
        <div
          className="absolute inset-0 backface-hidden rounded-2xl p-3 flex flex-col items-center justify-center text-center glass glow-border"
        >
          <span className={`mb-1.5 ${isSnack ? 'text-3xl animate-bounce' : 'text-2xl'}`}>
            {menu.icon}
          </span>
          {isSnack && (
            <span className="text-[9px] text-primary font-bold tracking-wider mb-0.5 bg-primary/10 px-2 py-0.5 rounded-full">
              🌟 NEW
            </span>
          )}
          <h3 className={`font-semibold text-foreground ${isSnack ? 'text-xs' : 'text-sm'}`}>{menu.name}</h3>
          <p className="text-[10px] text-muted-foreground mt-1 leading-tight px-1">{menu.desc}</p>
          {isSnack && (
            <span className="mt-1 text-[10px] font-bold text-primary">{formatElla(menu.price)}</span>
          )}
        </div>

        {/* Back - 뒷면 (모든 카드 어두운 네이비 유리 스타일로 통일) */}
        <div
          className="absolute inset-0 backface-hidden rotateY-180 rounded-2xl p-3 flex flex-col items-center justify-center text-center bg-slate-900/90 border border-primary/40"
        >
          <span className="text-[9px] font-semibold mb-2 text-primary/80">
            {menu.categoryName}
          </span>
          <span className="text-lg font-bold mb-2 text-primary">
            {formatElla(menu.price)}
          </span>
          
          <p className="text-[10px] mb-3 px-2 leading-tight text-slate-100">
            {menu.detailDesc || "상세 설명이 준비 중입니다."}
          </p>
          
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

export default function MenuGrid({ onSelect, onClose, counselorId }: MenuGridProps) {
  const [menusWithPrices, setMenusWithPrices] = useState<MenuWithPrice[]>([]);
  const [allProducts, setAllProducts] = useState<DbProduct[]>([]);

  // ✨ products 테이블에서 직접 로드
  useEffect(() => {
    const loadProducts = async () => {
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('enabled', true)
        .order('sort_order');

      if (products) {
        setAllProducts(products as DbProduct[]);

        // MENUS와 products 병합 (같은 이름 메뉴들 모두 포함)
        const merged: MenuWithPrice[] = [];

        products.forEach((product: DbProduct) => {
          const baseName = product.name.split(' - ')[0].trim();
          
          // 기존 MENUS에서 찾기
          const existingMenu = MENUS.find(m => {
            const mBaseName = m.name.split(' - ')[0].trim();
            return mBaseName === baseName;
          });

          if (existingMenu) {
            // 시간 정보 추가
            const durationText = product.duration_minutes === 0 
              ? '한 질문' 
              : `${product.duration_minutes}분`;
            
            merged.push({
              ...existingMenu,
              id: product.menu_id, // ✨ menu_id 사용
              name: product.name,
              price: product.price,
              desc: durationText,
              detailDesc: product.detail_desc || existingMenu.detailDesc,
              icon: product.icon || existingMenu.icon,
            } as MenuWithPrice);
          }
        });

        setMenusWithPrices(merged);
      } else {
        setMenusWithPrices(MENUS.map(m => ({ ...m, price: m.price } as MenuWithPrice)));
      }
    };

    loadProducts();

    const channel = supabase
      .channel('products-changes-menu')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          loadProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ✨ 상담사별 메뉴 필터링
  const getFilteredMenus = () => {
    if (!counselorId) return menusWithPrices;
    const counselor = COUNSELORS.find(c => c.id === counselorId);
    if (!counselor) return menusWithPrices;
    return menusWithPrices.filter(m => counselor.menuIds.includes(m.id));
  };

  const filteredMenus = getFilteredMenus();
  const currentCounselor = counselorId ? COUNSELORS.find(c => c.id === counselorId) : null;

  // ✨ 카테고리별 그룹핑
  const categories = ['A', 'B', 'C', 'D'] as const;
  const hasCategory = (cat: string) => filteredMenus.some(m => m.category === cat);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] aurora-bg overflow-y-auto scrollbar-hide"
    >
      <div className="max-w-3xl mx-auto px-4 pt-16 pb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="font-serif text-xl font-bold text-secondary-foreground">
              {currentCounselor ? `${currentCounselor.name}의 상담 메뉴` : '✨ 상담 메뉴'}
            </h2>
            {currentCounselor && (
              <p className="text-xs text-muted-foreground mt-0.5">{currentCounselor.specialty} 전문</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="glass rounded-full p-2 hover:bg-white/60 transition-colors active:scale-95"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {categories.map((cat) => {
          if (!hasCategory(cat)) return null;
          const items = filteredMenus.filter((m) => m.category === cat);
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

        {filteredMenus.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            준비된 메뉴가 없습니다
          </div>
        )}
      </div>
    </motion.div>
  );
}
