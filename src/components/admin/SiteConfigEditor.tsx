import { useState, useEffect } from 'react';
import { useSiteConfig, SiteConfig } from '@/hooks/useSiteConfig';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

export default function SiteConfigEditor() {
  const { config, updateConfig, loading } = useSiteConfig();
  const [local, setLocal] = useState<SiteConfig>(config);

  useEffect(() => { setLocal(config); }, [config]);

  const handleSave = async () => {
    const keys = Object.keys(local) as (keyof SiteConfig)[];
    for (const key of keys) {
      if (local[key] !== config[key]) {
        await updateConfig(key, local[key]);
      }
    }
    toast.success('사이트 설정이 저장되었습니다!');
  };

  if (loading) return <p className="text-sm text-muted-foreground">로딩 중...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">🌐 사이트 설정</h2>
        <button onClick={handleSave} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold">
          <Save className="w-3 h-3" /> 저장
        </button>
      </div>

      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1 block">메인 타이틀</label>
        <input
          value={local.hero_title}
          onChange={e => setLocal(p => ({ ...p, hero_title: e.target.value }))}
          className="w-full p-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1 block">메인 부제목</label>
        <input
          value={local.hero_subtitle}
          onChange={e => setLocal(p => ({ ...p, hero_subtitle: e.target.value }))}
          className="w-full p-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1 block">쿠폰 배너 문구</label>
        <input
          value={local.banner_text}
          onChange={e => setLocal(p => ({ ...p, banner_text: e.target.value }))}
          className="w-full p-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1 block">팝업 공지사항 (비우면 미노출)</label>
        <textarea
          value={local.popup_notice}
          onChange={e => setLocal(p => ({ ...p, popup_notice: e.target.value }))}
          className="w-full p-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          rows={3}
          placeholder="접속 시 팝업으로 표시됩니다"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground font-medium mb-1 block">하단 푸터 / 사업자 정보</label>
        <textarea
          value={local.footer_business_info}
          onChange={e => setLocal(p => ({ ...p, footer_business_info: e.target.value }))}
          className="w-full p-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          rows={3}
        />
      </div>
    </div>
  );
}
