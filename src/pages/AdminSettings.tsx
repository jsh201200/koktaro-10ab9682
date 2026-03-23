import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, RotateCcw, Palette, Type, Link2, CreditCard, ShoppingBag, FileText, MessageCircle, Shield, Globe, Tag, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loadSettings, saveSettings, resetSettings, SiteSettings, DEFAULT_SETTINGS } from '@/stores/siteSettings';
import { MENUS } from '@/data/menus';
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

interface Review {
  id?: string;
  user_nickname: string;
  masked_name: string;
  content: string;
  rating: number;
  menu_name?: string;
  is_approved: boolean;
  credits_awarded?: number;
  created_at?: string;
}

interface CouponData {
  couponCode: string;
  couponDiscount: number;
  couponActive: boolean;
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('branding');
  const [settings, setSettings] = useState<SiteSettings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 후기 관리 상태
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Review>({
    user_nickname: '',
    masked_name: '',
    content: '',
    rating: 5,
    menu_name: '종합분석',
    is_approved: true,
    credits_awarded: 1000,
  });

  const SAMPLE_REVIEWS = [
    {
      user_nickname: '민준',
      masked_name: '민*',
      content: '정말 명확한 조언을 받았어요! 일주일만에 변화가 느껴집니다 🌟',
      rating: 5,
      menu_name: '종합분석',
    },
    {
      user_nickname: '김영',
      masked_name: '김*',
      content: '궁합 상담이 정확했어요. 추천합니다!',
      rating: 5,
      menu_name: '궁합보기',
    },
    {
      user_nickname: '박서진',
      masked_name: '박**',
      content: '처음엔 의심했는데... 와 진짜 맞네요 😲',
      rating: 5,
      menu_name: '타로카드',
    },
    {
      user_nickname: '이수현',
      masked_name: '이*',
      content: '상담사님이 정말 친절하고 전문적이에요',
      rating: 5,
      menu_name: '심리상담',
    },
    {
      user_nickname: '정은지',
      masked_name: '정*',
      content: '비용은 좀 들었지만 정말 가치있었습니다',
      rating: 4,
      menu_name: '운세분석',
    },
    {
      user_nickname: '홍길동',
      masked_name: '홍*',
      content: '운명이 아니라 행동으로 바꾼다는 말... 깊이 생각해봤어요',
      rating: 5,
      menu_name: '종합분석',
    },
    {
      user_nickname: '최민서',
      masked_name: '최*',
      content: '친구에게 추천해줬더니 친구도 좋다고 했어요!',
      rating: 5,
      menu_name: '연애운',
    },
    {
      user_nickname: '손예진',
      masked_name: '손*',
      content: '잠깐이지만 기분이 좋아졌어요 ✨',
      rating: 4,
      menu_name: '한 뼘 운세',
    },
    {
      user_nickname: '곽은정',
      masked_name: '곽*',
      content: '전문적인 상담이었습니다. 감사합니다!',
      rating: 5,
      menu_name: '사주풀이',
    },
    {
      user_nickname: '서지현',
      masked_name: '서*',
      content: '다양한 관점에서 봐줘서 고마워요',
      rating: 5,
      menu_name: '관상분석',
    },
  ];

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

    if (activeTab === 'menus') {
      const upsertData = MENUS.map(menu => {
        const override = settings.menuOverrides[menu.id] || {};
        return {
          menu_id: menu.id,
          name: (override.name ?? menu.name) as string,
          icon: (override.icon ?? menu.icon) as string,
          desc: (override.desc ?? menu.desc) as string,
          detail_desc: (override.detailDesc ?? menu.detailDesc) as string,
          price: (override.price ?? menu.price) as number,
          enabled: override.enabled !== false,
          sort_order: menu.id,
        };
      });

      const { error } = await supabase
        .from('products')
        .upsert(upsertData, { onConflict: 'menu_id' });

      if (error) {
        toast.error('DB 저장 실패: ' + error.message);
        setIsSaving(false);
        return;
      }

      toast.success('상품 정보가 저장되었습니다! ✨');
    }

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

  const updateMenuOverride = (menuId: number, field: string, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      menuOverrides: {
        ...prev.menuOverrides,
        [menuId]: {
          ...prev.menuOverrides[menuId],
          [field]: value,
        },
      },
    }));
  };

  // 후기 추가
  const addSampleReviews = async () => {
    try {
      const reviewsWithDefaults = SAMPLE_REVIEWS.map((review) => ({
        ...review,
        is_approved: true,
        credits_awarded: 1000,
      }));

      const { error } = await supabase.from('reviews').insert(reviewsWithDefaults);

      if (error) {
        toast.error(`추가 실패: ${error.message}`);
        return;
      }

      toast.success('샘플 후기 10개가 추가되었습니다! 🎉');
      setShowAddForm(false);
      fetchReviews();
    } catch (err: any) {
      toast.error(`오류: ${err.message}`);
    }
  };

  const addReview = async () => {
    if (!formData.user_nickname || !formData.content) {
      toast.error('이름과 내용을 입력해주세요');
      return;
    }

    try {
      const { error } = await supabase.from('reviews').insert([
        {
          ...formData,
          is_approved: true,
          credits_awarded: 1000,
        },
      ]);

      if (error) {
        toast.error(`추가 실패: ${error.message}`);
        return;
      }

      toast.success('후기가 추가되었습니다! ✅');
      setFormData({
        user_nickname: '',
        masked_name: '',
        content: '',
        rating: 5,
        menu_name: '종합분석',
        is_approved: true,
        credits_awarded: 1000,
      });
      setShowAddForm(false);
      fetchReviews();
    } catch (err: any) {
      toast.error(`오류: ${err.message}`);
    }
  };

  const deleteReview = async (id: string) => {
    if (!confirm('정말 삭제할까요?')) return;

    try {
      const { error } = await supabase.from('reviews').delete().eq('id', id);

      if (error) {
        toast.error(`삭제 실패: ${error.message}`);
        return;
      }

      toast.success('후기가 삭제되었습니다');
      fetchReviews();
    } catch (err: any) {
      toast.error(`오류: ${err.message}`);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      setReviews(data || []);
    } catch (err: any) {
      toast.error(`조회 실패: ${err.message}`);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    const loadDbPrices = async () => {
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .order('sort_order');

      if (products && products.length > 0) {
        const overrides: Record<number, any> = { ...settings.menuOverrides };
        products.forEach((p: any) => {
          overrides[p.menu_id] = {
            ...overrides[p.menu_id],
            name: p.name,
            icon: p.icon,
            desc: p.desc,
            detailDesc: p.detail_desc,
            price: p.price,
            enabled: p.enabled,
          };
        });
        setSettings(prev => ({ ...prev, menuOverrides: overrides }));
      }
    };
    loadDbPrices();

    if (activeTab === 'reviews') {
      fetchReviews();
    }
  }, [isAuthorized, activeTab]);

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
          {activeTab === 'coupons' && <CouponManagerUI />}

          {/* 📝 후기 추가 섹션 */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">📝 후기 추가</h2>

                {/* 액션 버튼들 */}
                <div className="flex gap-3 mb-6 flex-wrap">
                  <button
                    onClick={addSampleReviews}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    샘플 후기 10개 추가
                  </button>

                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl glass hover:bg-white/60 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    개별 추가
                  </button>

                  <button
                    onClick={fetchReviews}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl glass hover:bg-white/60 transition-colors"
                  >
                    🔄 새로고침
                  </button>
                </div>

                {/* 개별 추가 폼 */}
                {showAddForm && (
                  <div className="glass rounded-2xl p-6 mb-6 space-y-4">
                    <h3 className="font-semibold text-foreground">후기 추가</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="사용자 이름"
                        value={formData.user_nickname}
                        onChange={(e) =>
                          setFormData({ ...formData, user_nickname: e.target.value })
                        }
                        className="px-3 py-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <input
                        type="text"
                        placeholder="마스킹 이름 (예: 민*)"
                        value={formData.masked_name}
                        onChange={(e) =>
                          setFormData({ ...formData, masked_name: e.target.value })
                        }
                        className="px-3 py-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <textarea
                      placeholder="후기 내용..."
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      rows={3}
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">별점</label>
                        <select
                          value={formData.rating}
                          onChange={(e) =>
                            setFormData({ ...formData, rating: parseInt(e.target.value) })
                          }
                          className="w-full px-3 py-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {'⭐'.repeat(n)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">메뉴명</label>
                        <input
                          type="text"
                          placeholder="예: 종합분석"
                          value={formData.menu_name || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, menu_name: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">적립금</label>
                        <input
                          type="number"
                          value={formData.credits_awarded || 1000}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              credits_awarded: parseInt(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={addReview}
                        className="flex-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:shadow-lg transition-all"
                      >
                        추가하기
                      </button>
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="flex-1 px-4 py-2 rounded-xl glass hover:bg-white/60 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}

                {/* 후기 목록 */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">
                    현재 후기 ({reviews.length}개)
                  </h3>

                  {reviews.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      후기가 없습니다. "샘플 후기 10개 추가"를 눌러보세요! 💬
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {reviews.map((review) => (
                        <div
                          key={review.id}
                          className="glass rounded-lg p-3 flex justify-between items-start"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-sm">
                                {review.masked_name}
                              </span>
                              <span className="text-xs text-yellow-500">
                                {'⭐'.repeat(review.rating)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {review.menu_name}
                              </span>
                            </div>
                            <p className="text-sm text-foreground line-clamp-2">
                              {review.content}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteReview(review.id!)}
                            className="ml-2 p-1.5 rounded-lg hover:bg-destructive/20 transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold text-secondary-foreground">🏷️ 브랜딩</h2>
              <Field label="사이트 이름" value={settings.siteName} onChange={v => updateField('siteName', v)} />
              <Field label="부제목" value={settings.siteSubtitle} onChange={v => updateField('siteSubtitle', v)} />
              <Field label="로고 이미지 URL" value={settings.logoUrl} onChange={v => updateField('logoUrl', v)} placeholder="비워두면 기본 프로필 사용" />
              <Field label="본문 폰트" value={settings.fontBody} onChange={v => updateField('fontBody', v)} />
              <Field label="제목 폰트 (Serif)" value={settings.fontSerif} onChange={v => updateField('fontSerif', v)} />
              {settings.logoUrl && (
                <div className="flex items-center gap-3 p-3 glass rounded-2xl">
                  <img src={settings.logoUrl} alt="logo preview" className="w-12 h-12 rounded-full object-cover" />
                  <span className="text-xs text-muted-foreground">로고 미리보기</span>
                </div>
              )}
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
              <div
                className="h-24 rounded-2xl shadow-inner border border-white/30"
                style={{
                  background: `linear-gradient(135deg, ${settings.bgGradientStart} 0%, ${settings.bgGradientMid1} 35%, ${settings.bgGradientMid2} 65%, ${settings.bgGradientEnd} 100%)`,
                }}
              >
                <div className="h-full flex items-center justify-center text-xs font-medium" style={{ color: settings.primaryColor }}>
                  배경 미리보기
                </div>
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

          {activeTab === 'menus' && (
            <div className="space-y-5">
              <h2 className="font-serif text-lg font-bold text-secondary-foreground">🛍️ 상품(메뉴) 관리</h2>
              <p className="text-xs text-muted-foreground">
                각 메뉴의 이름, 설명, 아이콘, 가격을 수정하고 <strong>저장 버튼</strong>을 누르면 즉시 반영됩니다.
              </p>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-hide">
                {MENUS.map(menu => {
                  const override = settings.menuOverrides[menu.id] || {};
                  return (
                    <details key={menu.id} className="glass rounded-2xl overflow-hidden group">
                      <summary className="p-3 cursor-pointer flex items-center gap-3 hover:bg-white/40 transition-colors">
                        <span className="text-lg">{override.icon ?? menu.icon}</span>
                        <span className="text-sm font-semibold text-foreground flex-1">
                          {menu.id}번 · {override.name ?? menu.name}
                        </span>
                        <span className="text-xs font-bold text-primary">
                          {((override.price ?? menu.price) as number).toLocaleString()}원
                        </span>
                      </summary>
                      <div className="p-3 pt-0 space-y-3 border-t border-border">
                        <div className="grid grid-cols-2 gap-3">
                          <Field
                            label="메뉴명"
                            value={(override.name ?? menu.name) as string}
                            onChange={v => updateMenuOverride(menu.id, 'name', v)}
                            small
                          />
                          <Field
                            label="아이콘 (이모지)"
                            value={(override.icon ?? menu.icon) as string}
                            onChange={v => updateMenuOverride(menu.id, 'icon', v)}
                            small
                          />
                        </div>
                        <Field
                          label="한 줄 요약"
                          value={(override.desc ?? menu.desc) as string}
                          onChange={v => updateMenuOverride(menu.id, 'desc', v)}
                          small
                        />
                        <Field
                          label="상세 설명"
                          value={(override.detailDesc ?? menu.detailDesc) as string}
                          onChange={v => updateMenuOverride(menu.id, 'detailDesc', v)}
                          small
                          multiline
                        />
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <label className="text-[10px] text-muted-foreground font-medium mb-1 block">가격 (원)</label>
                            <input
                              type="number"
                              value={override.price ?? menu.price}
                              onChange={e => updateMenuOverride(menu.id, 'price', parseInt(e.target.value) || 0)}
                              className="w-full p-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-4">
                            <label className="text-[10px] text-muted-foreground">활성화</label>
                            <input
                              type="checkbox"
                              checked={override.enabled !== false}
                              onChange={e => updateMenuOverride(menu.id, 'enabled', e.target.checked)}
                              className="w-4 h-4 accent-primary"
                            />
                          </div>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
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

// 🎟️ 쿠폰 관리 UI 컴포넌트
interface Coupon {
  id: number;
  coupon_code: string;
  coupon_name: string;
  discount_amount: number;
  valid_from: string;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  prevent_duplicate: boolean;
  is_active: boolean;
}

interface CouponUsage {
  id: number;
  coupon_id: number;
  user_id: string;
  user_phone: string;
  used_at: string;
  discount_amount: number;
}

function CouponManagerUI() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponUsage, setCouponUsage] = useState<CouponUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    coupon_code: '',
    coupon_name: '',
    discount_amount: '',
    valid_until: '',
    max_uses: '',
    prevent_duplicate: true,
    is_active: true,
  });

  const fetchCoupons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('쿠폰 조회 실패');
    } else {
      setCoupons(data || []);
    }
    setLoading(false);
  };

  const fetchCouponUsage = async (couponId: number) => {
    const { data, error } = await supabase
      .from('coupon_usage')
      .select('*')
      .eq('coupon_id', couponId)
      .order('used_at', { ascending: false });

    if (error) {
      toast.error('사용 내역 조회 실패');
    } else {
      setCouponUsage(data || []);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleSubmit = async () => {
    if (!formData.coupon_code.trim() || !formData.coupon_name.trim() || !formData.discount_amount) {
      toast.error('필수 정보를 입력해주세요');
      return;
    }

    if (parseInt(formData.discount_amount) <= 0) {
      toast.error('할인금액은 0보다 커야합니다');
      return;
    }

    setLoading(true);

    try {
      const data = {
        coupon_code: formData.coupon_code.trim().toUpperCase(),
        coupon_name: formData.coupon_name.trim(),
        discount_amount: parseInt(formData.discount_amount),
        valid_until: formData.valid_until || null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        prevent_duplicate: formData.prevent_duplicate,
        is_active: formData.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from('coupons')
          .update(data)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('쿠폰이 수정되었습니다!');
        setEditingId(null);
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert([data]);

        if (error) throw error;
        toast.success('쿠폰이 추가되었습니다!');
      }

      setFormData({
        coupon_code: '',
        coupon_name: '',
        discount_amount: '',
        valid_until: '',
        max_uses: '',
        prevent_duplicate: true,
        is_active: true,
      });
      setShowForm(false);
      fetchCoupons();
    } catch (err: any) {
      if (err.code === '23505') {
        toast.error('이미 존재하는 쿠폰 코드입니다');
      } else {
        toast.error('저장 실패: ' + err.message);
      }
    }

    setLoading(false);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setFormData({
      coupon_code: coupon.coupon_code,
      coupon_name: coupon.coupon_name,
      discount_amount: String(coupon.discount_amount),
      valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : '',
      max_uses: coupon.max_uses ? String(coupon.max_uses) : '',
      prevent_duplicate: coupon.prevent_duplicate,
      is_active: coupon.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('삭제 실패');
    } else {
      toast.success('쿠폰이 삭제되었습니다');
      fetchCoupons();
    }
  };

  const handleToggleActive = async (id: number, current: boolean) => {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !current })
      .eq('id', id);

    if (error) {
      toast.error('상태 변경 실패');
    } else {
      toast.success(!current ? '쿠폰이 활성화되었습니다' : '쿠폰이 비활성화되었습니다');
      fetchCoupons();
    }
  };

  const getUsagePercentage = (coupon: Coupon) => {
    if (!coupon.max_uses) return null;
    return Math.round((coupon.current_uses / coupon.max_uses) * 100);
  };

  const isExpired = (coupon: Coupon) => {
    if (!coupon.valid_until) return false;
    return new Date(coupon.valid_until) < new Date();
  };

  const isFullyUsed = (coupon: Coupon) => {
    if (!coupon.max_uses) return false;
    return coupon.current_uses >= coupon.max_uses;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">🎟️ 쿠폰 관리</h2>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              coupon_code: '',
              coupon_name: '',
              discount_amount: '',
              valid_until: '',
              max_uses: '',
              prevent_duplicate: true,
              is_active: true,
            });
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          새 쿠폰 추가
        </button>
      </div>

      {showForm && (
        <div className="glass-strong rounded-2xl p-6 glow-border space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              {editingId ? '쿠폰 수정' : '새 쿠폰 추가'}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="p-1 hover:bg-muted/50 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                쿠폰 코드 *
              </label>
              <input
                type="text"
                value={formData.coupon_code}
                onChange={(e) => setFormData({ ...formData, coupon_code: e.target.value.toUpperCase() })}
                placeholder="예: LUCKY2025"
                className="w-full p-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                disabled={!!editingId}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                쿠폰 이름 *
              </label>
              <input
                type="text"
                value={formData.coupon_name}
                onChange={(e) => setFormData({ ...formData, coupon_name: e.target.value })}
                placeholder="예: 신규 가입자 할인"
                className="w-full p-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                할인금액 (원) *
              </label>
              <input
                type="number"
                value={formData.discount_amount}
                onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                placeholder="3000"
                className="w-full p-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                min="0"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                유효 기한
              </label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full p-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                최대 사용 갯수
              </label>
              <input
                type="number"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                placeholder="100"
                className="w-full p-2 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="prevent_dup"
                  checked={formData.prevent_duplicate}
                  onChange={(e) => setFormData({ ...formData, prevent_duplicate: e.target.checked })}
                  className="w-4 h-4 accent-primary"
                />
                <label htmlFor="prevent_dup" className="text-xs font-semibold text-muted-foreground">
                  중복 사용 방지 (1인 1회)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 accent-primary"
                />
                <label htmlFor="is_active" className="text-xs font-semibold text-muted-foreground">
                  활성화
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? '저장 중...' : editingId ? '수정하기' : '추가하기'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="flex-1 px-4 py-2 rounded-xl glass hover:bg-white/60 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">
          쿠폰 목록 ({coupons.length}개)
        </h3>

        {coupons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            쿠폰이 없습니다. "새 쿠폰 추가"를 눌러보세요! 🎟️
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className={`glass-strong rounded-2xl p-4 transition-all ${
                  isExpired(coupon) ? 'opacity-60' : ''
                } ${isFullyUsed(coupon) ? 'opacity-60' : ''}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg text-foreground">{coupon.coupon_code}</span>
                      {!coupon.is_active && (
                        <span className="text-xs bg-muted px-2 py-1 rounded-lg text-muted-foreground">
                          비활성
                        </span>
                      )}
                      {isExpired(coupon) && (
                        <span className="text-xs bg-destructive/20 px-2 py-1 rounded-lg text-destructive">
                          기한만료
                        </span>
                      )}
                      {isFullyUsed(coupon) && (
                        <span className="text-xs bg-destructive/20 px-2 py-1 rounded-lg text-destructive">
                          소진됨
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{coupon.coupon_name}</p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(coupon.id, coupon.is_active)}
                      className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      {coupon.is_active ? (
                        <Eye className="w-4 h-4 text-primary" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(coupon)}
                      className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-primary" />
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="p-2 hover:bg-destructive/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  <div className="glass rounded-lg p-2">
                    <p className="text-muted-foreground">할인금액</p>
                    <p className="font-bold text-primary">{coupon.discount_amount.toLocaleString()}원</p>
                  </div>

                  {coupon.max_uses ? (
                    <div className="glass rounded-lg p-2">
                      <p className="text-muted-foreground">사용 현황</p>
                      <p className="font-bold">
                        {coupon.current_uses}/{coupon.max_uses} ({getUsagePercentage(coupon)}%)
                      </p>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${getUsagePercentage(coupon)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="glass rounded-lg p-2">
                      <p className="text-muted-foreground">사용 현황</p>
                      <p className="font-bold">{coupon.current_uses}회 (무제한)</p>
                    </div>
                  )}

                  {coupon.valid_until && (
                    <div className="glass rounded-lg p-2">
                      <p className="text-muted-foreground">유효 기한</p>
                      <p className="font-bold">{new Date(coupon.valid_until).toLocaleDateString('ko-KR')}</p>
                    </div>
                  )}

                  <div className="glass rounded-lg p-2">
                    <p className="text-muted-foreground">중복 방지</p>
                    <p className="font-bold">{coupon.prevent_duplicate ? '1인 1회' : '무제한'}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedCouponId(selectedCouponId === coupon.id ? null : coupon.id);
                    if (selectedCouponId !== coupon.id) {
                      fetchCouponUsage(coupon.id);
                    }
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  {selectedCouponId === coupon.id ? '사용 내역 숨기기' : `사용 내역 보기 (${coupon.current_uses}건)`}
                </button>

                {selectedCouponId === coupon.id && couponUsage.length > 0 && (
                  <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                    <p className="text-xs text-muted-foreground font-semibold mb-2">📋 사용 내역:</p>
                    {couponUsage.map((usage) => (
                      <div key={usage.id} className="text-xs bg-muted/30 p-2 rounded-lg">
                        <div className="flex justify-between">
                          <span className="font-semibold">{usage.user_phone}</span>
                          <span className="text-muted-foreground">
                            {new Date(usage.used_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <p className="text-muted-foreground">-{usage.discount_amount.toLocaleString()}원</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
