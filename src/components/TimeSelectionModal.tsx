import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Check } from 'lucide-react';

interface Product {
  id: string;
  menu_id: number;
  name: string;
  icon: string;
  price: number;
  duration_minutes: number;
  enabled: boolean;
}

interface TimeSelectionModalProps {
  selectedMenu: Product;
  allProducts: Product[];
  onSelect: (product: Product) => void;
  onClose: () => void;
}

export default function TimeSelectionModal({
  selectedMenu,
  allProducts,
  onSelect,
  onClose,
}: TimeSelectionModalProps) {
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    // 🔍 같은 이름의 메뉴들 찾기
    // 예: "타로"로 시작하는 모든 메뉴들 (10분, 20분, 30분 등)
    const baseName = selectedMenu.name.split(' - ')[0].trim(); // "타로 - 10분" → "타로"
    
    const related = allProducts
      .filter(p => {
        const pBaseName = p.name.split(' - ')[0].trim();
        return pBaseName === baseName && p.enabled;
      })
      .sort((a, b) => a.duration_minutes - b.duration_minutes);

    setRelatedProducts(related);
    
    // 기본 선택: 첫 번째 상품
    if (related.length > 0) {
      setSelectedProduct(related[0]);
    }
  }, [selectedMenu, allProducts]);

  const handleSelect = () => {
    if (selectedProduct) {
      onSelect(selectedProduct);
    }
  };

  // 만약 시간 선택 옵션이 1개면 바로 선택
  useEffect(() => {
    if (relatedProducts.length === 1 && selectedProduct) {
      onSelect(selectedProduct);
    }
  }, [relatedProducts, selectedProduct, onSelect]);

  if (relatedProducts.length <= 1) {
    return null; // 시간 선택 모달 불필요
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      >
        {/* 배경 */}
        <div
          className="absolute inset-0 bg-background/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* 모달 */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative glass-strong rounded-3xl p-6 max-w-sm w-full shadow-2xl glow-border"
        >
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-muted/40 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* 헤더 */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{selectedMenu.icon}</span>
              <div>
                <h2 className="font-serif text-2xl font-bold text-foreground">
                  시간 선택
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedMenu.name.split(' - ')[0].trim()}
                </p>
              </div>
            </div>
          </div>

          {/* 시간 옵션들 */}
          <div className="space-y-3 mb-6">
            {relatedProducts.map((product) => {
              const isSelected = selectedProduct?.id === product.id;
              const durationText = product.duration_minutes === 0 
                ? '한 질문' 
                : `${product.duration_minutes}분`;

              return (
                <motion.button
                  key={product.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedProduct(product)}
                  className={`w-full p-4 rounded-2xl transition-all ${
                    isSelected
                      ? 'glass-strong glow-border ring-2 ring-primary/50 bg-primary/10'
                      : 'glass hover:bg-white/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-primary" />
                        <p className="font-semibold text-foreground">{durationText}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {product.price.toLocaleString()}원
                      </p>
                    </div>

                    {/* 선택 체크 */}
                    <motion.div
                      animate={{
                        scale: isSelected ? 1 : 0.8,
                        opacity: isSelected ? 1 : 0.4,
                      }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ml-3 ${
                        isSelected ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary-foreground" />
                      )}
                    </motion.div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* 안내 텍스트 */}
          {selectedProduct && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary/10 rounded-xl p-3 mb-6 border border-primary/20"
            >
              <p className="text-xs text-primary font-semibold">
                ✨ {selectedProduct.duration_minutes === 0 ? '한 질문' : `${selectedProduct.duration_minutes}분`} 상담을 선택하셨습니다
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                결제 후 바로 상담을 시작할 수 있어요!
              </p>
            </motion.div>
          )}

          {/* 버튼들 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl glass hover:bg-white/40 transition-colors font-semibold text-sm"
            >
              취소
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedProduct}
              className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              선택 완료
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
