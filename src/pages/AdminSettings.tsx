import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, RotateCcw, Palette, Type, Link2, CreditCard, ShoppingBag, FileText, MessageCircle, Shield, Globe, Tag, Plus, Trash2, X, Edit2, Eye, EyeOff } from 'lucide-react';
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
  couponCode: string; couponDiscount: number; couponMinPrice: number; couponActive: boolean; couponBanner: string;
  newUserDiscount: number; newUserMinPrice: number; newUserDiscountActive: boolean; newUserBanner: string;
}

interface Product {
  id: string; menu_id: number; name: string; icon: string; desc: string; detail_desc: string; price: number; enabled: boolean; sort_order: number; duration_minutes: number;
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('branding');
  const [settings, setSettings] = useState<SiteSettings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [bannerSettings, setBannerSettings] = useState<BannerSettings>({
    couponCode: 'KOKTARO', couponDiscount: 3000, couponMinPrice: 9900, couponActive: true, couponBanner: '🎟️ 쿠폰에 오신 걸 환영합니다! {{minPrice}}원 이상 구매시 {{discount}}원 할인 중',
    newUserDiscount: 5000, newUserMinPrice: 19000, newUserDiscountActive: true, newUserBanner: '🎉 신규가입자 한정! {{minPrice}}원 이상 구매시 {{discount}}원 할인!',
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const handlePasswordCheck = (val: string) => {
    setPassword(val);
    const s = loadSettings();
    if (val === s.adminPassword) setIsAuthorized(true);
  };

  // 📥 [추가됨] 페이지 접속 시 DB에서 최신 testMode 값을 가져와서 버튼 상태 동기화
  useEffect(() => {
    if (!isAuthorized) return;
    const syncTestMode = async () => {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'testMode').single();
      if (data && data.value !== null) {
        const isTest = data.value === true || data.value === 'true';
        setSettings(prev => ({ ...prev, testMode: isTest }));
      }
    };
    syncTestMode();
  }, [isAuthorized]);

  const handleSave = async () => {
    setIsSaving(true);
    saveSettings(settings);

    try {
      // 1. 쿠폰 설정 저장
      await supabase.from('site_settings').upsert({ key: 'coupon', value: bannerSettings }, { onConflict: 'key' });

      // 2. 테스트 모드 상태를 DB에 저장 (이게 되어야 다른 기기에서도 보임)
      await supabase.from('site_settings').upsert({ key: 'testMode', value: settings.testMode }, { onConflict: 'key' });

      toast.success('설정이 저장되었습니다! 전 기기에 즉시 반영됩니다 ✨');
      setSaved(true);
    } catch (error: any) {
      console.error(error);
      toast.error('저장 실패');
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

  // 나머지 데이터 로드 로직
  useEffect(() => {
    if (!isAuthorized) return;
    supabase.from('site_settings').select('value').eq('key', 'coupon').single().then(({ data }) => {
      if (data && data.value) setBannerSettings(data.value as BannerSettings);
    });
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized || activeTab !== 'menus') return;
    setLoadingProducts(true);
    supabase.from('products').select('*').order('sort_order').then(({ data }) => {
      if (data) setProducts(data as Product[]);
      setLoadingProducts(false);
    });
  }, [isAuthorized, activeTab]);

  const handleSaveProduct = async () => {
    if (!editingProduct) return;
    const { error } = await supabase.from('products').update({
      name: editingProduct.name, icon: editingProduct.icon, desc: editingProduct.desc,
      detail_desc: editingProduct.detail_desc, price: editingProduct.price,
      duration_minutes: editingProduct.duration_minutes, enabled: editingProduct.enabled,
    }).eq('id', editingProduct.id);
    if (!error) {
      toast.success('수정 완료');
      setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p));
      setEditingProduct(null);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-svh aurora-bg flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center glow-border">
          <h2 className="font-serif text-xl font-bold mb-4">관리자 인증</h2>
          <input type="password" value={password} onChange={(e) => handlePasswordCheck(e.target.value)} className="w-full p-3 rounded-2xl glass text-center focus:outline-none" placeholder="비밀번호" autoFocus />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-svh aurora-bg">
      <header className="sticky top-0 z-50 glass px-4 py-3 sm:px-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="p-2 rounded-xl hover:bg-white/50"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="font-serif text-lg font-bold">⚙️ 관리자 설정</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="px-3 py-2 rounded-xl glass text-xs flex items-center gap-1"><RotateCcw className="w-3 h-3" /> 초기화</button>
          <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold active:scale-95 disabled:opacity-70">
            <Save className="w-3 h-3 inline mr-1" /> {isSaving ? '저장 중...' : saved ? '✅ 완료' : '저장'}
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-4">
        <nav className="lg:w-48 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto scrollbar-hide">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-md' : 'glass text-foreground'}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 glass-strong rounded-3xl p-5 sm:p-6 glow-border">
          {activeTab === 'site' && <SiteConfigEditor />}

          {activeTab === 'coupons' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold mb-6">🎟️ 배너 & 할인 설정</h2>
              <div className="glass-strong rounded-3xl p-6 glow-border mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">💳 전체 할인 (쿠폰)</h3>
                  <button onClick={() => setBannerSettings({ ...bannerSettings, couponActive: !bannerSettings.couponActive })} className={`relative w-12 h-6 rounded-full transition-colors ${bannerSettings.couponActive ? 'bg-primary' : 'bg-muted'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${bannerSettings.couponActive ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="space-y-4">
                  <Field label="쿠폰 코드" value={bannerSettings.couponCode} onChange={(v) => setBannerSettings({ ...bannerSettings, couponCode: v.toUpperCase() })} />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="할인 금액" value={bannerSettings.couponDiscount.toString()} onChange={(v) => setBannerSettings({ ...bannerSettings, couponDiscount: parseInt(v) || 0 })} />
                    <Field label="최소 구매 금액" value={bannerSettings.couponMinPrice.toString()} onChange={(v) => setBannerSettings({ ...bannerSettings, couponMinPrice: parseInt(v) || 0 })} />
                  </div>
                  <textarea value={bannerSettings.couponBanner} onChange={(e) => setBannerSettings({ ...bannerSettings, couponBanner: e.target.value })} className="w-full p-3 rounded-xl glass text-sm resize-none" rows={3} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold">🔒 보안 및 테스트</h2>
              <Field label="관리자 비밀번호" value={settings.adminPassword} onChange={v => updateField('adminPassword', v)} type="password" />
              <div className="glass rounded-2xl p-4 border border-primary/20 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">🧪 테스트 모드</p>
                  <p className="text-[10px] text-muted-foreground">켜고 '저장' 누르면 모든 기기에서 즉시 결제 패스</p>
                </div>
                <button onClick={() => updateField('testMode', !settings.testMode)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.testMode ? 'bg-primary' : 'bg-muted'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings.testMode ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          )}
          
          {/* 다른 탭들 (브랜딩, 결제 등) 기존 코드 유지 */}
          {activeTab === 'branding' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold">🏷️ 브랜딩</h2>
              <Field label="사이트 이름" value={settings.siteName} onChange={v => updateField('siteName', v)} />
              <Field label="부제목" value={settings.siteSubtitle} onChange={v => updateField('siteSubtitle', v)} />
              <Field label="로고 이미지 URL" value={settings.logoUrl} onChange={v => updateField('logoUrl', v)} />
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold">💳 결제 정보</h2>
              <Field label="은행명" value={settings.bankName} onChange={v => updateField('bankName', v)} />
              <Field label="계좌번호" value={settings.bankAccount} onChange={v => updateField('bankAccount', v)} />
              <Field label="예금주" value={settings.bankHolder} onChange={v => updateField('bankHolder', v)} />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground font-medium mb-1 block">{label}</label>
      <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)} className="w-full p-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder={placeholder} />
    </div>
  );
}
