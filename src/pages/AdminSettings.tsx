import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Save, RotateCcw, Palette, Type, Link2, 
  CreditCard, ShoppingBag, FileText, MessageCircle, 
  Shield, Globe, Tag, Plus, Trash2, X, Edit2, Eye, EyeOff, Settings 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loadSettings, saveSettings, resetSettings, SiteSettings, DEFAULT_SETTINGS } from '@/stores/siteSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SiteConfigEditor from '@/components/admin/SiteConfigEditor';

type Tab = 'branding' | 'colors' | 'links' | 'payment' | 'menus' | 'legal' | 'messages' | 'security' | 'coupons' | 'site' | 'reviews';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'site', label: '사이트 설정', icon: <Globe className="w-4 h-4" /> },
  { id: 'branding', label: '브랜딩', icon: <Type className="w-4 h-4" /> },
  { id: 'colors', label: '배경/색상', icon: <Palette className="w-4 h-4" /> },
  { id: 'links', label: '링크 연결', icon: <Link2 className="w-4 h-4" /> },
  { id: 'payment', label: '결제 정보', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'menus', label: '상품 관리', icon: <ShoppingBag className="w-4 h-4" /> },
  { id: 'legal', label: '법적 고지', icon: <FileText className="w-4 h-4" /> },
  { id: 'messages', label: '메시지', icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'security', label: '보안', icon: <Shield className="w-4 h-4" /> },
];

interface BannerSettings {
  couponCode: string;
  couponDiscount: number;
  couponMinPrice: number;
  couponActive: boolean;
  couponBanner: string;
  newUserDiscount: number;
  newUserMinPrice: number;
  newUserDiscountActive: boolean;
  newUserBanner: string;
}

interface Product {
  id: string;
  menu_id: number;
  name: string;
  icon: string;
  desc: string;
  detail_desc: string;
  price: number;
  enabled: boolean;
  sort_order: number;
  duration_minutes: number;
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('branding');
  const [settings, setSettings] = useState<SiteSettings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 🆕 배너 설정 초기값 (모든 항목을 미리 채워 데이터 로딩 전 에러 방지)
  const [bannerSettings, setBannerSettings] = useState<BannerSettings>({
    couponCode: 'KOKTARO',
    couponDiscount: 3000,
    couponMinPrice: 9900,
    couponActive: true,
    couponBanner: '🎟️ 쿠폰에 오신 걸 환영합니다! {{minPrice}}원 이상 구매시 {{discount}}원 할인 중',
    newUserDiscount: 5000,
    newUserMinPrice: 19000,
    newUserDiscountActive: true,
    newUserBanner: '🎉 신규가입자 한정! {{minPrice}}원 이상 구매시 {{discount}}원 할인!',
  });

  // 🆕 상품 관리 상태
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const handlePasswordCheck = (val: string) => {
    setPassword(val);
    const s = loadSettings();
    if (val === s.adminPassword) {
      setIsAuthorized(true);
    }
  };

  // 📥 [실시간 연동 핵심 1] 테스트 모드 기기간 즉시 동기화
  useEffect(() => {
    if (!isAuthorized) return;

    const syncSystemSettings = async () => {
      // 1. 초기 DB 값 가져오기
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'testMode').single();
      if (data && data.value !== null) {
        const isTest = typeof data.value === 'object' ? !!(data.value as any).testMode : (data.value === true || data.value === 'true');
        setSettings(prev => ({ ...prev, testMode: isTest }));
      }

      // 2. 실시간 구독 (컴퓨터에서 바꾸면 폰에서도 버튼이 즉시 바뀜)
      const channel = supabase
        .channel('admin-realtime-test')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings', filter: 'key=eq.testMode' }, (payload) => {
          const newVal = payload.new ? payload.new.value : null;
          if (newVal !== null) {
            const isTest = typeof newVal === 'object' ? !!newVal.testMode : (newVal === true || newVal === 'true');
            setSettings(prev => ({ ...prev, testMode: isTest }));
          }
        })
        .subscribe();

      return channel;
    };

    const channelPromise = syncSystemSettings();
    return () => { channelPromise.then(c => c && supabase.removeChannel(c)); };
  }, [isAuthorized]);

  const handleSave = async () => {
    setIsSaving(true);
    saveSettings(settings);

    try {
      // 🆕 배너 설정 DB 저장
      await supabase.from('site_settings').upsert({ key: 'coupon', value: bannerSettings }, { onConflict: 'key' });
      
      // 🆕 테스트 모드 DB 저장 (이게 되어야 실시간 연동이 시작됨)
      await supabase.from('site_settings').upsert({ key: 'testMode', value: settings.testMode }, { onConflict: 'key' });

      toast.success('모든 설정이 저장되었습니다! 실시간으로 반영됩니다. ✨');
      setSaved(true);
    } catch (error: any) {
      toast.error('저장 실패: ' + error.message);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleReset = () => {
    if (confirm('모든 설정을 초기값으로 되돌리시겠습니까?')) {
      resetSettings();
      setSettings(DEFAULT_SETTINGS);
    }
  };

  const updateField = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // 🆕 상품 로딩 및 [실시간 연동 핵심 2] 상품 목록 즉시 동기화
  useEffect(() => {
    if (!isAuthorized || activeTab !== 'menus') return;

    const loadProducts = async () => {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('sort_order');

      if (error) {
        toast.error('상품 로드 실패: ' + error.message);
      } else if (data) {
        setProducts(data as Product[]);
      }
      setLoadingProducts(false);
    };

    loadProducts();

    // 🚀 상품 정보가 바뀌면 목록을 새로고침합니다.
    const productChannel = supabase
      .channel('admin-product-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadProducts();
      })
      .subscribe();

    return () => { supabase.removeChannel(productChannel); };
  }, [isAuthorized, activeTab]);

  // 🆕 상품 수정 저장 (원본 로직 보존)
  const handleSaveProduct = async () => {
    if (!editingProduct) return;

    const { error } = await supabase
      .from('products')
      .update({
        name: editingProduct.name,
        icon: editingProduct.icon,
        desc: editingProduct.desc,
        detail_desc: editingProduct.detail_desc,
        price: editingProduct.price,
        duration_minutes: editingProduct.duration_minutes,
        enabled: editingProduct.enabled,
      })
      .eq('id', editingProduct.id);

    if (error) {
      toast.error('저장 실패: ' + error.message);
    } else {
      toast.success('상품이 수정되었습니다! ✨');
      setEditingProduct(null);
    }
  };
// 🆕 상품 삭제 (Part 1의 실시간 채널이 삭제 감지 시 목록을 자동 갱신합니다)
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      toast.error('삭제 실패: ' + error.message);
    } else {
      toast.success('상품이 삭제되었습니다');
      // 로컬 상태에서도 즉시 제거하여 반응 속도를 높입니다.
      setProducts(products.filter(p => p.id !== productId));
    }
  };

  // 🔐 [관리자 인증 화면] - 디자인 및 토씨 하나 빠짐없이 보존
  if (!isAuthorized) {
    return (
      <div className="min-h-svh aurora-bg flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center glow-border"
        >
          <span className="text-4xl mb-4 block">⚙️</span>
          <h2 className="font-serif text-xl font-bold text-secondary-foreground mb-4">관리자 설정</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => handlePasswordCheck(e.target.value)}
            className="w-full p-3 rounded-2xl glass text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
            placeholder="비밀번호 입력"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-3">관리자 비밀번호를 입력하세요</p>
        </motion.div>
      </div>
    );
  }

  // 🏠 [메인 관리자 UI]
  return (
    <div className="min-h-svh aurora-bg">
      <header className="sticky top-0 z-50 glass px-4 py-3 sm:px-6">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin')} className="p-2 rounded-xl hover:bg-white/50 transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="font-serif text-lg font-bold text-secondary-foreground">⚙️ 관리자 설정</h1>
              <p className="text-[10px] text-muted-foreground">사이트 전체 커스터마이징</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-xl glass text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/60 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> 초기화
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:shadow-lg transition-all active:scale-95 flex items-center gap-1 disabled:opacity-70"
            >
              <Save className="w-3 h-3" /> {isSaving ? '저장 중...' : saved ? '✅ 저장됨!' : '저장'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-4">
        {/* 사이드바 내비게이션 */}
        <nav className="lg:w-48 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto scrollbar-hide py-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'glass hover:bg-white/60 text-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* 메인 컨텐츠 영역 */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 glass-strong rounded-3xl p-5 sm:p-6 glow-border min-h-[500px]"
        >
          {/* 🧪 [실시간 연동 핵심 스위치] 모든 탭 최상단에 배치하여 즉각적인 제어 가능 */}
          <div className="mb-8 p-4 glass rounded-2xl border border-primary/20 flex justify-between items-center bg-primary/5">
             <div>
               <p className="text-sm font-bold text-foreground flex items-center gap-1">🧪 실시간 테스트 모드</p>
               <p className="text-[10px] text-muted-foreground">이 스위치를 켜고 저장하면 모든 접속 기기의 결제가 생략됩니다.</p>
             </div>
             <button 
               onClick={() => updateField('testMode', !settings.testMode)} 
               className={`relative w-12 h-6 rounded-full transition-all duration-300 ${settings.testMode ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]' : 'bg-muted'}`}
             >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${settings.testMode ? 'translate-x-7' : 'translate-x-1'}`} />
             </button>
          </div>

          {activeTab === 'site' && <SiteConfigEditor />}
{/* 🛍️ 상품 관리 탭 (승하님 원본 디자인 + 실시간 반응형 리스트) */}
          {activeTab === 'menus' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-foreground">🛍️ 상품 관리</h2>
                {/* 필요 시 여기에 '상품 추가' 버튼을 배치할 수 있습니다 */}
              </div>

              {loadingProducts ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-4 font-medium">실시간 상품 정보를 불러오는 중...</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                  {products.length === 0 ? (
                    <div className="text-center py-10 glass rounded-3xl border border-dashed border-muted-foreground/30">
                      <p className="text-sm text-muted-foreground">등록된 상품이 없습니다.</p>
                    </div>
                  ) : (
                    products.map((product) => (
                      <div key={product.id} className="glass rounded-2xl p-4 transition-all duration-300 hover:shadow-lg glow-border-hover">
                        {editingProduct?.id === product.id ? (
                          // 📝 [수정 모드] - 승하님이 만든 모든 입력 필드 완벽 보존
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground ml-1">메뉴명</label>
                                <input
                                  type="text"
                                  value={editingProduct.name}
                                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                  className="w-full p-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  placeholder="메뉴명"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground ml-1">가격(원)</label>
                                <input
                                  type="number"
                                  value={editingProduct.price}
                                  onChange={(e) => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) || 0 })}
                                  className="w-full p-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  placeholder="가격"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground ml-1">아이콘(이모지)</label>
                                <input
                                  type="text"
                                  value={editingProduct.icon}
                                  onChange={(e) => setEditingProduct({ ...editingProduct, icon: e.target.value })}
                                  className="w-full p-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-center"
                                  placeholder="아이콘"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground ml-1">상담 시간(분)</label>
                                <input
                                  type="number"
                                  value={editingProduct.duration_minutes}
                                  onChange={(e) => setEditingProduct({ ...editingProduct, duration_minutes: parseInt(e.target.value) || 0 })}
                                  className="w-full p-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  placeholder="시간"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground ml-1">짧은 설명</label>
                              <textarea
                                value={editingProduct.desc}
                                onChange={(e) => setEditingProduct({ ...editingProduct, desc: e.target.value })}
                                className="w-full p-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                rows={2}
                                placeholder="리스트에 노출될 짧은 설명"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground ml-1">상세 리딩 안내</label>
                              <textarea
                                value={editingProduct.detail_desc}
                                onChange={(e) => setEditingProduct({ ...editingProduct, detail_desc: e.target.value })}
                                className="w-full p-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                rows={3}
                                placeholder="결제 전 보여줄 상세 안내 문구"
                              />
                            </div>

                            <div className="flex items-center gap-3 py-1">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`active-${product.id}`}
                                  checked={editingProduct.enabled}
                                  onChange={(e) => setEditingProduct({ ...editingProduct, enabled: e.target.checked })}
                                  className="w-4 h-4 accent-primary"
                                />
                                <label htmlFor={`active-${product.id}`} className="text-xs font-bold text-muted-foreground cursor-pointer">서비스 활성화</label>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={handleSaveProduct}
                                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-lg active:scale-95 transition-all"
                              >
                                변경사항 저장
                              </button>
                              <button
                                onClick={() => setEditingProduct(null)}
                                className="flex-1 py-2.5 rounded-xl glass text-xs font-bold hover:bg-white/40 active:scale-95 transition-all"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          // 👁️ [조회 모드] - 승하님의 깔끔한 레이아웃 보존
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-2xl">{product.icon}</span>
                                <p className="font-bold text-base text-foreground">{product.name}</p>
                                {!product.enabled && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-bold">비활성</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{product.desc}</p>
                              <div className="flex gap-4 text-xs font-bold">
                                <span className="text-primary">💰 {product.price?.toLocaleString() || 0}원</span>
                                <span className="text-muted-foreground">⏱️ {product.duration_minutes || 0}분</span>
                              </div>
                            </div>
                            <div className="flex gap-1.5 ml-4">
                              <button
                                onClick={() => setEditingProduct(product)}
                                className="p-2.5 rounded-xl glass hover:bg-white/50 text-primary transition-colors"
                                title="수정"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="p-2.5 rounded-xl glass hover:bg-destructive/10 text-destructive transition-colors"
                                title="삭제"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
{/* 🏷️ 브랜딩 설정 탭 */}
          {activeTab === 'branding' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold text-secondary-foreground">🏷️ 브랜딩</h2>
              <Field label="사이트 이름" value={settings.siteName} onChange={v => updateField('siteName', v)} />
              <Field label="부제목" value={settings.siteSubtitle} onChange={v => updateField('siteSubtitle', v)} />
              <Field label="로고 이미지 URL" value={settings.logoUrl} onChange={v => updateField('logoUrl', v)} placeholder="비워두면 기본 프로필 사용" />
            </div>
          )}

          {/* 🎨 배경 / 색상 탭 (승하님의 2단 그리드 레이아웃 완벽 보존) */}
          {activeTab === 'colors' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold text-secondary-foreground">🎨 배경 / 색상</h2>
              <p className="text-xs text-muted-foreground">오로라 그라데이션 배경 색상을 커스터마이징합니다.</p>
              <div className="grid grid-cols-2 gap-4">
                <ColorField label="그라데이션 시작" value={settings.bgGradientStart} onChange={v => updateField('bgGradientStart', v)} />
                <ColorField label="그라데이션 중간 1" value={settings.bgGradientMid1} onChange={v => updateField('bgGradientMid1', v)} />
                <ColorField label="그라데이션 중간 2" value={settings.bgGradientMid2} onChange={v => updateField('bgGradientMid2', v)} />
                <ColorField label="그라데이션 끝" value={settings.bgGradientEnd} onChange={v => updateField('bgGradientEnd', v)} />
                <div className="col-span-2">
                  <ColorField label="기본 강조색 (Primary)" value={settings.primaryColor} onChange={v => updateField('primaryColor', v)} />
                </div>
              </div>
            </div>
          )}

          {/* 🔗 링크 연결 탭 */}
          {activeTab === 'links' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold text-secondary-foreground">🔗 링크 연결</h2>
              <Field label="카카오페이 링크" value={settings.kakaoPayLink} onChange={v => updateField('kakaoPayLink', v)} />
              <Field label="카카오 채널 링크" value={settings.kakaoChannelLink} onChange={v => updateField('kakaoChannelLink', v)} />
              <Field label="Discord 웹훅 URL" value={settings.discordWebhook} onChange={v => updateField('discordWebhook', v)} placeholder="알림 수신용" />
            </div>
          )}

          {/* 💳 결제 정보 탭 */}
          {activeTab === 'payment' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold text-secondary-foreground">💳 결제 정보</h2>
              <Field label="은행명" value={settings.bankName} onChange={v => updateField('bankName', v)} />
              <Field label="계좌번호" value={settings.bankAccount} onChange={v => updateField('bankAccount', v)} />
              <Field label="예금주" value={settings.bankHolder} onChange={v => updateField('bankHolder', v)} />
            </div>
          )}

          {/* 📜 법적 고지 탭 (원본 텍스트박스 디자인 보존) */}
          {activeTab === 'legal' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold text-secondary-foreground">📜 법적 고지</h2>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block ml-1">면책 조항</label>
                <textarea
                  value={settings.disclaimerText}
                  onChange={e => updateField('disclaimerText', e.target.value)}
                  className="w-full p-3 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none text-foreground"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block ml-1">환불 규정</label>
                <textarea
                  value={settings.refundPolicy}
                  onChange={e => updateField('refundPolicy', e.target.value)}
                  className="w-full p-3 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none text-foreground"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* 💬 메시지 설정 탭 */}
          {activeTab === 'messages' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold text-secondary-foreground">💬 메시지 설정</h2>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block ml-1">첫 인사 메시지</label>
                <textarea
                  value={settings.welcomeMessage}
                  onChange={e => updateField('welcomeMessage', e.target.value)}
                  className="w-full p-3 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none text-foreground"
                  rows={4}
                />
              </div>
            </div>
          )}
{/* 🔒 보안 설정 탭 (관리자 비번 및 실시간 테스트 모드) */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold text-secondary-foreground">🔒 보안</h2>
              <Field
                label="관리자 비밀번호"
                value={settings.adminPassword}
                onChange={v => updateField('adminPassword', v)}
                type="password"
              />
              <p className="text-[10px] text-muted-foreground ml-1">
                이 비밀번호는 관리자 대시보드(/admin), 관리자 설정, 채팅 승인 단축키에 사용됩니다.
              </p>

              {/* 🧪 테스트 모드 섹션 (실시간 연동 핵심) */}
              <div className="glass rounded-2xl p-4 border border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      🧪 실시간 테스트 모드
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      켜두면 결제 과정 없이 모든 상담을 즉시 시작할 수 있습니다.
                    </p>
                    {settings.testMode && (
                      <p className="text-[10px] text-destructive font-bold mt-1 animate-pulse">
                        ⚠️ 현재 테스트 모드 ON — 실제 서비스 오픈 전 반드시 끄고 저장하세요!
                      </p>
                    )}
                  </div>
                  {/* 🚀 이 버튼은 Part 1에서 만든 실시간 감시 채널과 연동되어 전 기기 동기화됩니다 */}
                  <button
                    onClick={() => updateField('testMode', !settings.testMode)}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 shadow-inner ${
                      settings.testMode ? 'bg-primary shadow-[0_0_12px_rgba(var(--primary),0.5)]' : 'bg-muted'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${
                      settings.testMode ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ⚙️ [우측 상단 톱니바퀴 버튼] - 관리자 메인으로 즉각 이동 */}
      <button
        onClick={() => navigate('/admin')}
        className="fixed top-3 right-3 z-[60] p-2 rounded-full glass hover:bg-muted/60 transition-colors shadow-lg group active:scale-95"
        title="관리자 대시보드"
      >
        <Settings className="w-4 h-4 text-muted-foreground group-hover:rotate-90 transition-transform duration-500" />
      </button>
    </div>
  );
}

/**
 * 🧱 [헬퍼 함수 1] Field: 일반 텍스트 및 멀티라인 입력 전용
 * 승하님이 설정한 레이아웃과 스타일링을 100% 보존합니다.
 */
function Field({ label, value, onChange, placeholder, type, small, multiline }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  small?: boolean;
  multiline?: boolean;
}) {
  const cls = `w-full p-${small ? '2' : '2.5'} rounded-xl glass text-${small ? 'xs' : 'sm'} focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground transition-all`;
  return (
    <div className="space-y-1">
      <label className={`text-${small ? '[10px]' : 'xs'} text-muted-foreground font-semibold mb-1 block ml-1`}>
        {label}
      </label>
      {multiline ? (
        <textarea 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          className={`${cls} resize-none`} 
          rows={2} 
          placeholder={placeholder} 
        />
      ) : (
        <input 
          type={type || 'text'} 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          className={cls} 
          placeholder={placeholder} 
        />
      )}
    </div>
  );
}

/**
 * 🎨 [헬퍼 함수 2] ColorField: 색상 선택 및 HEX 코드 입력 전용
 * 오로라 배경 커스터마이징의 핵심 디자인을 보존합니다.
 */
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] text-muted-foreground font-semibold mb-1 block ml-1">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative w-9 h-9 rounded-xl glass p-1 glow-border-hover transition-all">
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full h-full rounded-lg border-0 cursor-pointer bg-transparent appearance-none"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 p-2 rounded-xl glass text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-foreground uppercase tracking-tight"
          placeholder="#FFFFFF"
        />
      </div>
    </div>
  );
}
