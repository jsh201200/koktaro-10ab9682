import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, X, Eye, EyeOff } from 'lucide-react';

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
  created_at: string;
}

interface CouponUsage {
  id: number;
  coupon_id: number;
  user_id: string;
  user_phone: string;
  used_at: string;
  discount_amount: number;
}

export default function CouponManager() {
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

      {/* 쿠폰 추가/수정 폼 */}
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
              <p className="text-[10px] text-muted-foreground mt-1">변경 불가</p>
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
              <p className="text-[10px] text-muted-foreground mt-1">비워두면 무제한</p>
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
              <p className="text-[10px] text-muted-foreground mt-1">비워두면 무제한</p>
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

      {/* 쿠폰 목록 */}
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
                      title={coupon.is_active ? '비활성화' : '활성화'}
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

                {/* 사용 내역 */}
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
