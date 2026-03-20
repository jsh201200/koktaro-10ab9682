import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SiteConfig {
  banner_text: string;
  popup_notice: string;
  footer_business_info: string;
  hero_title: string;
  hero_subtitle: string;
}

const DEFAULTS: SiteConfig = {
  banner_text: '💫 콕타로에 오신 당신! 9,900원 이상 결제 시 3,000원 자동 할인 중',
  popup_notice: '',
  footer_business_info: '본 서비스는 데이터 분석을 기반으로 한 인사이트 에듀테인먼트 콘텐츠이며, 상담 결과는 자기 탐색을 위한 참고 자료일 뿐 법적 책임을 보장하지 않습니다.',
  hero_title: '콕타로',
  hero_subtitle: '당신의 운명을 콕 집어줄게',
};

export function useSiteConfig() {
  const [config, setConfig] = useState<SiteConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    const { data } = await supabase.from('site_config').select('key, value');
    if (data) {
      const merged = { ...DEFAULTS };
      data.forEach((row: any) => {
        const key = row.key as keyof SiteConfig;
        if (key in merged) {
          merged[key] = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
          // Strip surrounding quotes from JSON strings
          if (merged[key].startsWith('"') && merged[key].endsWith('"')) {
            merged[key] = merged[key].slice(1, -1);
          }
        }
      });
      setConfig(merged);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const updateConfig = useCallback(async (key: keyof SiteConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    await supabase.from('site_config').update({ value: JSON.stringify(value) }).eq('key', key);
  }, []);

  return { config, loading, updateConfig, refetch: fetchConfig };
}
