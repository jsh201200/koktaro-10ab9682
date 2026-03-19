import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PhoneAuthProps {
  onAuth: (profile: { id: string; phone: string; nickname: string; credits: number; birth_date?: string; birth_time?: string; gender?: string }) => void;
  onSkip: () => void;
}

export default function PhoneAuth({ onAuth, onSkip }: PhoneAuthProps) {
  const [step, setStep] = useState<'phone' | 'new_pin' | 'verify_pin' | 'nickname'>('phone');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [existingProfile, setExistingProfile] = useState<any>(null);

  const formatPhone = (val: string) => {
    const nums = val.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
  };

  const handlePhoneSubmit = async () => {
    const cleanPhone = phone.replace(/-/g, '');
    if (cleanPhone.length < 10) {
      toast.error('전화번호를 정확히 입력해주세요');
      return;
    }

    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('phone', cleanPhone)
      .single();

    if (data) {
      setExistingProfile(data);
      setStep('verify_pin');
    } else {
      setStep('new_pin');
    }
  };

  const handleVerifyPin = async () => {
    if (!existingProfile) return;
    
    if (pin === existingProfile.pin) {
      // Clear any cached session that doesn't belong to this user
      const cachedSessionId = localStorage.getItem('howl_session_id');
      if (cachedSessionId) {
        // Verify cached session belongs to this profile
        const { data: sessionData } = await supabase
          .from('chat_sessions')
          .select('profile_id')
          .eq('id', cachedSessionId)
          .single();
        
        if (!sessionData || sessionData.profile_id !== existingProfile.id) {
          // Session doesn't belong to this user - clear it
          localStorage.removeItem('howl_session_id');
        }
      }
      
      localStorage.setItem('howl_profile_id', existingProfile.id);
      onAuth({
        id: existingProfile.id,
        phone: existingProfile.phone,
        nickname: existingProfile.nickname || '',
        credits: existingProfile.credits || 0,
        birth_date: existingProfile.birth_date,
        birth_time: existingProfile.birth_time,
        gender: existingProfile.gender,
      });
      toast.success(`${existingProfile.nickname || ''}님, 다시 만나서 반가워요! ✨`);
    } else {
      toast.error('비밀번호가 일치하지 않아요');
      setPin('');
    }
  };

  const handleNewPin = () => {
    if (pin.length !== 4) {
      toast.error('4자리 비밀번호를 입력해주세요');
      return;
    }
    setStep('nickname');
  };

  const handleCreateProfile = async () => {
    if (!nickname.trim()) {
      toast.error('호칭을 입력해주세요');
      return;
    }

    const cleanPhone = phone.replace(/-/g, '');

    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        phone: cleanPhone,
        pin,
        nickname: nickname.trim(),
      })
      .select()
      .single();

    if (error) {
      toast.error('프로필 생성에 실패했어요');
      return;
    }

    // Clear any old session cache for fresh start
    localStorage.removeItem('howl_session_id');
    localStorage.setItem('howl_profile_id', data.id);

    onAuth({
      id: data.id,
      phone: cleanPhone,
      nickname: nickname.trim(),
      credits: 0,
    });
    toast.success('프로필이 생성되었어요! ✨');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative glass-strong rounded-3xl p-6 max-w-sm w-full shadow-2xl glow-border"
      >
        <div className="text-center mb-5">
          <span className="text-3xl mb-2 block">🔮</span>
          <h3 className="font-display text-xl font-bold text-foreground neon-glow">KOK TAROT</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {step === 'phone' && '전화번호로 간편하게 시작해요'}
            {step === 'verify_pin' && '비밀번호를 입력해주세요'}
            {step === 'new_pin' && '상담용 비밀번호 4자리를 설정해주세요'}
            {step === 'nickname' && '상담사가 부를 호칭을 알려주세요'}
          </p>
        </div>

        {step === 'phone' && (
          <div className="space-y-3">
            <input
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              className="w-full p-3 rounded-2xl glass text-center text-lg tracking-wider text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="010-0000-0000"
              type="tel"
              autoFocus
            />
            <button
              onClick={handlePhoneSubmit}
              disabled={phone.replace(/-/g, '').length < 10}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              다음
            </button>
            <button
              onClick={onSkip}
              className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              번호 없이 시작하기
            </button>
          </div>
        )}

        {step === 'verify_pin' && (
          <div className="space-y-3">
            <input
              value={pin}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPin(v);
              }}
              className="w-full p-3 rounded-2xl glass text-center text-2xl tracking-[0.5em] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="····"
              type="password"
              maxLength={4}
              autoFocus
            />
            <button
              onClick={handleVerifyPin}
              disabled={pin.length !== 4}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              확인
            </button>
            <button
              onClick={() => { setStep('phone'); setPin(''); }}
              className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← 번호 다시 입력
            </button>
          </div>
        )}

        {step === 'new_pin' && (
          <div className="space-y-3">
            <input
              value={pin}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPin(v);
              }}
              className="w-full p-3 rounded-2xl glass text-center text-2xl tracking-[0.5em] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="····"
              type="password"
              maxLength={4}
              autoFocus
            />
            <p className="text-[10px] text-muted-foreground text-center">다음 방문 시 적립금과 상담 이력을 불러올 수 있어요</p>
            <button
              onClick={handleNewPin}
              disabled={pin.length !== 4}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}

        {step === 'nickname' && (
          <div className="space-y-3">
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              className="w-full p-3 rounded-2xl glass text-center text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="호칭을 입력해주세요"
              autoFocus
            />
            <button
              onClick={handleCreateProfile}
              disabled={!nickname.trim()}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              상담 시작하기 ✨
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
