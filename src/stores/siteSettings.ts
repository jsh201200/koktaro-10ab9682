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
  // Branding
  siteName: string;
  siteSubtitle: string;
  logoUrl: string;
  fontBody: string;
  fontSerif: string;

  // Colors (aurora gradient)
  bgGradientStart: string;
  bgGradientMid1: string;
  bgGradientMid2: string;
  bgGradientEnd: string;
  primaryColor: string;

  // Links
  kakaoPayLink: string;
  kakaoChannelLink: string;
  discordWebhook: string;

  // Bank info
  bankName: string;
  bankAccount: string;
  bankHolder: string;

  // Menus (override per menu)
  menuOverrides: Record<number, Partial<MenuSetting>>;

  // Footer / legal
  disclaimerText: string;
  refundPolicy: string;

  // Welcome message
  welcomeMessage: string;

  // Admin password
  adminPassword: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: '하울의 챗봇상담소',
  siteSubtitle: '천상계 점술 상담',
  logoUrl: '',
  fontBody: 'Noto Sans KR',
  fontSerif: 'Noto Serif KR',

  bgGradientStart: '#FDFCFB',
  bgGradientMid1: '#E2D1F9',
  bgGradientMid2: '#F5E3E6',
  bgGradientEnd: '#FDFCFB',
  primaryColor: '#6B3FA0',

  kakaoPayLink: 'https://qr.kakaopay.com/Ej82jM60H',
  kakaoChannelLink: 'https://pf.kakao.com/_cLdxhX',
  discordWebhook: '',

  bankName: '카카오뱅크',
  bankAccount: '3333-36-8761312',
  bankHolder: '정승하',

  menuOverrides: {},

  disclaimerText: '본 상담은 엔터테인먼트 콘텐츠이며, 의학적·법률적·재무적 자문을 대체할 수 없습니다.',
  refundPolicy: '디지털 콘텐츠 특성상 리딩 시작 후 환불이 불가합니다.',

  welcomeMessage: '안녕! 하울의 상담소에 온 걸 환영해. ✨\n\n너의 기운을 느끼기 전에, 내가 너를 뭐라고 부르면 좋을지 알려줄래?',

  adminPassword: '9304',
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
  // Dispatch event so other components can react
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
