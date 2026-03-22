import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, RotateCcw, Palette, Type, Link2, CreditCard, ShoppingBag, FileText, MessageCircle, Shield, Globe, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loadSettings, saveSettings, resetSettings, SiteSettings, DEFAULT_SETTINGS } from '@/stores/siteSettings';
import { MENUS } from '@/data/menus';
import CouponManager from '@/components/admin/CouponManager';
import SiteConfigEditor from '@/components/admin/SiteConfigEditor';

type Tab = 'branding' | 'colors' | 'links' | 'payment' | 'menus' | 'legal' | 'messages' | 'security' | 'coupons' | 'site';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'site', label: '사이트 설정', icon: <Globe className="w-4 h-4" /> },
  { id: 'coupons', label: '쿠폰/이벤트', icon: <Tag className="w-4 h-4" /> },
  { id: 'branding', label: '브랜딩', icon: <Type className="w-4 h-4" /> },
  { id: 'colors', label: '배경/색상', icon: <Palette className="w-4 h-4" /> },
  { id: 'links', label: '링크 연결', icon: <Link2 className="w-4 h-4" /> },
  { id: 'payment', label: '결제 정보', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'menus', label: '상품 관리', icon: <ShoppingBag className="w-4 h-4" /> },
  { id: 'legal', label: '법적 고지', icon: <FileText className="w-4 h-4" /> },
  { id: 'messages', label: '메시지', icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'security', label: '보안', icon: <Shield className="w-4 h-4" /> },
];

export default function AdminSettings() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('branding');
  const [settings, setSettings] = useState<SiteSettings>(loadSettings);
  const [saved, setSaved] = useState(false);

  const handlePasswordCheck = (val: string) => {
    setPassword(val);
    const s = loadSettings();
    if (val === s.adminPassword) {
      setIsAuthorized(true);
    }
  };

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
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
      {/* Header */}
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
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:shadow-lg transition-all active:scale-95 flex items-center gap-1"
            >
              <Save className="w-3 h-3" /> {saved ? '✅ 저장됨!' : '저장'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-4">
        {/* Sidebar tabs */}
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

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 glass-strong rounded-3xl p-5 sm:p-6 glow-border"
        >
          {activeTab === 'site' && <SiteConfigEditor />}

          {activeTab === 'coupons' && <CouponManager />}

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
              {/* Preview */}
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
              <p className="text-xs text-muted-foreground">각 메뉴의 이름, 설명, 아이콘, 가격을 수정할 수 있습니다.</p>
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
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// Reusable field components
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
