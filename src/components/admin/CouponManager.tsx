import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Save } from 'lucide-react';

interface Coupon {
  id: string;
  name: string;
  code: string;
  discount_amount: number;
  min_price: number;
  is_active: boolean;
  expires_at: string | null;
}

export default function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCoupons = async () => {
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (data) setCoupons(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleAdd = async () => {
    const { error } = await supabase.from('coupons').insert({
      name: '새 쿠폰',
      code: 'NEW' + Date.now().toString().slice(-6),
      discount_amount: 1000,
      min_price: 0,
      is_active: true,
    });
    if (error) { toast.error('추가 실패'); return; }
    toast.success('쿠폰 추가됨');
    fetchCoupons();
  };

  const handleUpdate = async (coupon: Coupon) => {
    const { error } = await supabase.from('coupons').update({
      name: coupon.name,
      code: coupon.code,
      discount_amount: coupon.discount_amount,
      min_price: coupon.min_price,
      is_active: coupon.is_active,
      expires_at: coupon.expires_at,
    }).eq('id', coupon.id);
    if (error) { toast.error('저장 실패'); return; }
    toast.success('저장 완료');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 쿠폰을 삭제하시겠습니까?')) return;
    await supabase.from('coupons').delete().eq('id', id);
    toast.success('삭제 완료');
    fetchCoupons();
  };

  const updateLocal = (id: string, field: string, value: any) => {
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  if (loading) return <p className="text-sm text-muted-foreground">로딩 중...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">🎟️ 쿠폰 / 이벤트 관리</h2>
        <button onClick={handleAdd} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold">
          <Plus className="w-3 h-3" /> 추가
        </button>
      </div>

      {coupons.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">등록된 쿠폰이 없습니다</p>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-hide">
          {coupons.map(c => (
            <div key={c.id} className="glass rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium mb-1 block">쿠폰명</label>
                  <input
                    value={c.name}
                    onChange={e => updateLocal(c.id, 'name', e.target.value)}
                    className="w-full p-2 rounded-xl glass text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium mb-1 block">쿠폰 코드</label>
                  <input
                    value={c.code}
                    onChange={e => updateLocal(c.id, 'code', e.target.value)}
                    className="w-full p-2 rounded-xl glass text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium mb-1 block">할인금액 (원)</label>
                  <input
                    type="number"
                    value={c.discount_amount}
                    onChange={e => updateLocal(c.id, 'discount_amount', parseInt(e.target.value) || 0)}
                    className="w-full p-2 rounded-xl glass text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium mb-1 block">최소금액 (원)</label>
                  <input
                    type="number"
                    value={c.min_price}
                    onChange={e => updateLocal(c.id, 'min_price', parseInt(e.target.value) || 0)}
                    className="w-full p-2 rounded-xl glass text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium mb-1 block">만료일</label>
                  <input
                    type="date"
                    value={c.expires_at ? c.expires_at.split('T')[0] : ''}
                    onChange={e => updateLocal(c.id, 'expires_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="w-full p-2 rounded-xl glass text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={c.is_active}
                    onChange={e => updateLocal(c.id, 'is_active', e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  활성화
                </label>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleUpdate(c)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-bold">
                    <Save className="w-3 h-3" /> 저장
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
