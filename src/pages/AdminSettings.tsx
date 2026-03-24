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
  { id: 'coupons', label: '쿠폰/이벤트', icon: <Tag className="w-4 h-4" /> },
  { id: 'reviews', label: '후기 추가', icon: <MessageCircle className="w-4 h-4" /> },
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

  // 🆕 배너 설정
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

  // 🆕 상품 관리
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

  const handleSave = async () => {
    setIsSaving(true);
    saveSettings(settings);

    // 🆕 배너 설정 저장
    const { error } = await supabase
      .from('site_settings')
      .upsert(
        { key: 'coupon', value: bannerSettings },
        { onConflict: 'key' }
      );

    if (error) {
      toast.error('저장 실패: ' + error.message);
      setIsSaving(false);
      return;
    }

    toast.success('설정이 저장되었습니다! ✨');
    setSaved(true);
    setIsSaving(false);
    setTimeout(() => setSaved(false), 2000);
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

  // 🆕 배너 설정 로드
  useEffect(() => {
    if (!isAuthorized) return;

    const loadBannerSettings = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'coupon')
        .single();

      if (data && data.value) {
        setBannerSettings(data.value as BannerSettings);
      }
    };

    loadBannerSettings();
  }, [isAuthorized]);

  // 🆕 상품 로드
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
  }, [isAuthorized, activeTab]);

  // 🆕 상품 수정 저장
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
      setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p));
      setEditingProduct(null);
    }
  };

  // 🆕 상품 삭제
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
      setProducts(products.filter(p => p.id !== productId));
    }
  };

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
            className="w-full p-3 rounded-2xl glass text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="비밀번호 입력"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-3">관리자 비밀번호를 입력하세요</p>
        </motion.div>
      </div>
    );
  }

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
        <nav className="lg:w-48 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto scrollbar-hide">
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

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 glass-strong rounded-3xl p-5 sm:p-6 glow-border"
        >
          {activeTab === 'site' && <SiteConfigEditor />}

{/* 🎟️ 쿠폰 탭 (맛탱이 방지 안전 버전) */}
          {activeTab === 'coupons' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">🎟️ 배너 & 할인 설정</h2>
              <div className="glass-strong rounded-3xl p-6 glow-border mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">💳 전체 할인 (쿠폰)</h3>
                  <button onClick={() => setBannerSettings(prev => ({ ...prev, couponActive: !prev.couponActive }))} className={`relative w-12 h-6 rounded-full transition-colors ${bannerSettings?.couponActive ? 'bg-primary' : 'bg-muted'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${bannerSettings?.couponActive ? 'translate-x-7' : 'translate-x-1'}`} /></button>
                </div>
                <div className="space-y-4">
                  <Field label="쿠폰 코드" value={bannerSettings?.couponCode || ''} onChange={(v) => setBannerSettings(p => ({ ...p, couponCode: v.toUpperCase() }))} />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="할인 금액" value={(bannerSettings?.couponDiscount || 0).toString()} onChange={(v) => setBannerSettings(p => ({ ...p, couponDiscount: parseInt(v) || 0 }))} />
                    <Field label="최소 금액" value={(bannerSettings?.couponMinPrice || 0).toString()} onChange={(v) => setBannerSettings(p => ({ ...p, couponMinPrice: parseInt(v) || 0 }))} />
                  </div>
                  <Field label="배너 텍스트" value={bannerSettings?.couponBanner || ''} onChange={(v) => setBannerSettings(p => ({ ...p, couponBanner: v }))} multiline />
                  <div className="bg-primary/10 rounded-xl p-3 border border-primary/20"><p className="text-xs text-primary font-semibold">📋 미리보기:</p><p className="text-sm text-foreground mt-1">
                    {(bannerSettings?.couponBanner || '배너를 입력하세요').replace('{{discount}}', (bannerSettings?.couponDiscount || 0).toLocaleString()).replace('{{minPrice}}', (bannerSettings?.couponMinPrice || 0).toLocaleString())}
                  </p></div>
                </div>
              </div>

                {/* 🎉 신규가입자 섹션 (안전 버전) */}
              <div className="glass-strong rounded-3xl p-6 glow-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">🎉 신규가입자 할인</h3>
                  <button onClick={() => setBannerSettings(p => ({ ...p, newUserDiscountActive: !p.newUserDiscountActive }))} className={`relative w-12 h-6 rounded-full transition-colors ${bannerSettings?.newUserDiscountActive ? 'bg-primary' : 'bg-muted'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${bannerSettings?.newUserDiscountActive ? 'translate-x-7' : 'translate-x-1'}`} /></button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="할인 금액" value={(bannerSettings?.newUserDiscount || 0).toString()} onChange={(v) => setBannerSettings(p => ({ ...p, newUserDiscount: parseInt(v) || 0 }))} />
                    <Field label="최소 금액" value={(bannerSettings?.newUserMinPrice || 0).toString()} onChange={(v) => setBannerSettings(p => ({ ...p, newUserMinPrice: parseInt(v) || 0 }))} />
                  </div>
                  <Field label="배너 텍스트" value={bannerSettings?.newUserBanner || ''} onChange={(v) => setBannerSettings(p => ({ ...p, newUserBanner: v }))} multiline />
                  <div className="bg-primary/10 rounded-xl p-3 border border-primary/20"><p className="text-xs text-primary font-semibold">📋 미리보기:</p><p className="text-sm text-foreground mt-1">
                    {(bannerSettings?.newUserBanner || '배너를 입력하세요').replace('{{discount}}', (bannerSettings?.newUserDiscount || 0).toLocaleString()).replace('{{minPrice}}', (bannerSettings?.newUserMinPrice || 0).toLocaleString())}
                  </p></div>
                </div>
              </div>
            </div>
          )}

                {/* 💡 팁 섹션 */}
                <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/20">
                  <p className="text-xs text-primary font-semibold mb-2">💡 팁:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• {'{{discount}}'} - 할인 금액 자동 변환</li>
                    <li>• {'{{minPrice}}'} - 최소 금액 자동 변환</li>
                  </ul>
                </div>
              </div>
            </div>
          )}          {/* 🆕 상품 관리 탭 */}
          {activeTab === 'menus' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground">🛍️ 상품 관리</h2>

              {loadingProducts ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">로딩 중...</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {products.map((product) => (
                    <div key={product.id} className="glass rounded-2xl p-4">
                      {editingProduct?.id === product.id ? (
                        // 수정 모드
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={editingProduct.name}
                              onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                              className="p-2 rounded-lg glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                              placeholder="메뉴명"
                            />
                            <input
                              type="number"
                              value={editingProduct.price}
                              onChange={(e) => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) || 0 })}
                              className="p-2 rounded-lg glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                              placeholder="가격"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={editingProduct.icon}
                              onChange={(e) => setEditingProduct({ ...editingProduct, icon: e.target.value })}
                              className="p-2 rounded-lg glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                              placeholder="아이콘 이모지"
                            />
                            <input
                              type="number"
                              value={editingProduct.duration_minutes}
                              onChange={(e) => setEditingProduct({ ...editingProduct, duration_minutes: parseInt(e.target.value) || 0 })}
                              className="p-2 rounded-lg glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                              placeholder="시간(분)"
                            />
                          </div>

                          <textarea
                            value={editingProduct.desc}
                            onChange={(e) => setEditingProduct({ ...editingProduct, desc: e.target.value })}
                            className="w-full p-2 rounded-lg glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                            rows={2}
                            placeholder="짧은 설명"
                          />

                          <textarea
                            value={editingProduct.detail_desc}
                            onChange={(e) => setEditingProduct({ ...editingProduct, detail_desc: e.target.value })}
                            className="w-full p-2 rounded-lg glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                            rows={2}
                            placeholder="상세 설명"
                          />

                          <div className="flex items-center gap-2 mb-3">
                            <input
                              type="checkbox"
                              checked={editingProduct.enabled}
                              onChange={(e) => setEditingProduct({ ...editingProduct, enabled: e.target.checked })}
                              className="w-4 h-4"
                            />
                            <label className="text-xs font-medium text-muted-foreground">활성화</label>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveProduct}
                              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => setEditingProduct(null)}
                              className="flex-1 py-2 rounded-lg glass text-xs font-bold"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        // 조회 모드
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{product.icon}</span>
                              <p className="font-semibold text-sm text-foreground">{product.name}</p>
                              {!product.enabled && <span className="text-[10px] px-2 py-0.5 rounded bg-destructive/20 text-destructive">비활성</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">{product.desc}</p>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>💰 {product.price.toLocaleString()}원</span>
                              <span>⏱️ {product.duration_minutes}분</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingProduct(product)}
                              className="p-2 rounded-lg glass hover:bg-white/40 transition-colors"
                              title="수정"
                            >
                              <Edit2 className="w-4 h-4 text-primary" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-2 rounded-lg glass hover:bg-destructive/20 transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold text-secondary-foreground">🏷️ 브랜딩</h2>
              <Field label="사이트 이름" value={settings.siteName} onChange={v => updateField('siteName', v)} />
              <Field label="부제목" value={settings.siteSubtitle} onChange={v => updateField('siteSubtitle', v)} />
              <Field label="로고 이미지 URL" value={settings.logoUrl} onChange={v => updateField('logoUrl', v)} placeholder="비워두면 기본 프로필 사용" />
            </div>
          )}

          {activeTab === 'colors' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold text-secondary-foreground">🎨 배경 / 색상</h2>
              <p className="text-xs text-muted-foreground">오로라 그라데이션 배경 색상을 커스터마이징합니다.</p>
              <div className="grid grid-cols-2 gap-4">
                <ColorField label="그라데이션 시작" value={settings.bgGradientStart} onChange={v => updateField('bgGradientStart', v)} />
                <ColorField label="그라데이션 중간 1" value={settings.bgGradientMid1} onChange={v => updateField('bgGradientMid1', v)} />
                <ColorField label="그라데이션 중간 2" value={settings.bgGradientMid2} onChange={v => updateField('bgGradientMid2', v)} />
                <ColorField label="그라데이션 끝" value={settings.bgGradientEnd} onChange={v => updateField('bgGradientEnd', v)} />
                <ColorField label="기본 강조색 (Primary)" value={settings.primaryColor} onChange={v => updateField('primaryColor', v)} />
              </div>
            </div>
          )}

          {activeTab === 'links' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold text-secondary-foreground">🔗 링크 연결</h2>
              <Field label="카카오페이 링크" value={settings.kakaoPayLink} onChange={v => updateField('kakaoPayLink', v)} />
              <Field label="카카오 채널 링크" value={settings.kakaoChannelLink} onChange={v => updateField('kakaoChannelLink', v)} />
              <Field label="Discord 웹훅 URL" value={settings.discordWebhook} onChange={v => updateField('discordWebhook', v)} placeholder="알림 수신용" />
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold text-secondary-foreground">💳 결제 정보</h2>
              <Field label="은행명" value={settings.bankName} onChange={v => updateField('bankName', v)} />
              <Field label="계좌번호" value={settings.bankAccount} onChange={v => updateField('bankAccount', v)} />
              <Field label="예금주" value={settings.bankHolder} onChange={v => updateField('bankHolder', v)} />
            </div>
          )}

          {activeTab === 'legal' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold text-secondary-foreground">📜 법적 고지</h2>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">면책 조항</label>
                <textarea
                  value={settings.disclaimerText}
                  onChange={e => updateField('disclaimerText', e.target.value)}
                  className="w-full p-3 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">환불 규정</label>
                <textarea
                  value={settings.refundPolicy}
                  onChange={e => updateField('refundPolicy', e.target.value)}
                  className="w-full p-3 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold text-secondary-foreground">💬 메시지 설정</h2>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">첫 인사 메시지</label>
                <textarea
                  value={settings.welcomeMessage}
                  onChange={e => updateField('welcomeMessage', e.target.value)}
                  className="w-full p-3 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={4}
                />
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold text-secondary-foreground">🔒 보안</h2>
              <Field
                label="관리자 비밀번호"
                value={settings.adminPassword}
                onChange={v => updateField('adminPassword', v)}
                type="password"
              />
              <p className="text-[10px] text-muted-foreground">
                이 비밀번호는 관리자 대시보드(/admin), 관리자 설정, 채팅 승인 단축키에 사용됩니다.
              </p>

              <div className="glass rounded-2xl p-4 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">🧪 테스트 모드</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      켜두면 결제 없이 모든 상담 바로 시작 가능
                    </p>
                    {settings.testMode && (
                      <p className="text-[10px] text-destructive font-semibold mt-1">
                        ⚠️ 현재 테스트 모드 ON — 실제 서비스 전에 꼭 끄세요!
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => updateField('testMode', !settings.testMode)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.testMode ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      settings.testMode ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type, small, multiline }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  small?: boolean;
  multiline?: boolean;
}) {
  const cls = `w-full p-${small ? '2' : '2.5'} rounded-xl glass text-${small ? 'xs' : 'sm'} focus:outline-none focus:ring-2 focus:ring-primary/30`;
  return (
    <div>
      <label className={`text-${small ? '[10px]' : 'xs'} text-muted-foreground font-medium mb-1 block`}>{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} className={`${cls} resize-none`} rows={2} placeholder={placeholder} />
      ) : (
        <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)} className={cls} placeholder={placeholder} />
      )}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground font-medium mb-1 block">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg border-0 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 p-2 rounded-xl glass text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
        />
      </div>
    </div>
  );
}
