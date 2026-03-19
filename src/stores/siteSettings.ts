import { useState, useEffect, useCallback } from 'react';

export interface MenuSetting {
  id: number;
  name: string;
  icon: string;
  desc: string;
  detailDesc: string;
  price: number;
  enabled: boolean;
}

export interface SiteSettings {
  siteName: string;
  siteSubtitle: string;
  logoUrl: string;
  fontBody: string;
  fontSerif: string;

  bgGradientStart: string;
  bgGradientMid1: string;
  bgGradientMid2: string;
  bgGradientEnd: string;
  primaryColor: string;

  kakaoPayLink: string;
  kakaoChannelLink: string;
  discordWebhook: string;

  bankName: string;
  bankAccount: string;
  bankHolder: string;

  menuOverrides: Record<number, Partial<MenuSetting>>;

  disclaimerText: string;
  refundPolicy: string;
  welcomeMessage: string;
  adminPassword: string;

  // Beta mode: skip real payment
  betaMode: boolean;
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: '콕타로',
  siteSubtitle: '당신의 운명을 콕 집어줄게',
  logoUrl: '',
  fontBody: 'Pretendard',
  fontSerif: 'Cormorant Garamond',

  bgGradientStart: '#0f0a1a',
  bgGradientMid1: '#1a1030',
  bgGradientMid2: '#150d20',
  bgGradientEnd: '#0f0a1a',
  primaryColor: '#8B5CF6',

  kakaoPayLink: 'https://qr.kakaopay.com/Ej82jM60H',
  kakaoChannelLink: 'https://pf.kakao.com/_cLdxhX',
  discordWebhook: '',

  bankName: '카카오뱅크',
  bankAccount: '3333-36-8761312',
  bankHolder: '정승하',

  menuOverrides: {},

  disclaimerText: '본 상담은 엔터테인먼트 콘텐츠이며, 의학적·법률적·재무적 자문을 대체할 수 없습니다.',
  refundPolicy: '디지털 콘텐츠 특성상 리딩 시작 후 환불이 불가합니다.',

  welcomeMessage: '안녕! 콕타로에 온 걸 환영해 ✨\n\n너의 기운을 느끼기 전에, 내가 너를 뭐라고 부르면 좋을지 알려줄래?',

  adminPassword: '9304',

  betaMode: true,
};

const STORAGE_KEY = 'howl_site_settings';

export function loadSettings(): SiteSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: SiteSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('howl-settings-changed', { detail: settings }));
}

export function resetSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('howl-settings-changed', { detail: DEFAULT_SETTINGS }));
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(loadSettings);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSettings(detail);
    };
    window.addEventListener('howl-settings-changed', handler);
    return () => window.removeEventListener('howl-settings-changed', handler);
  }, []);

  const update = useCallback((partial: Partial<SiteSettings>) => {
    const next = { ...loadSettings(), ...partial };
    saveSettings(next);
    setSettings(next);
  }, []);

  return { settings, update };
}

export { DEFAULT_SETTINGS };
