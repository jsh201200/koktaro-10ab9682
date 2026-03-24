import { motion } from 'framer-motion';
import { Printer, X, FileText, Award } from 'lucide-react';

interface ChatMessage {
  id?: string;
  role: 'bot' | 'user' | 'system';
  content: string;
}

interface PremiumReportProps {
  counselorName: string;
  menuName: string;
  userName: string;
  chatMessages: ChatMessage[];
  onClose: () => void;
}

export default function PremiumReport({
  counselorName,
  menuName,
  userName,
  chatMessages,
  onClose,
}: PremiumReportProps) {
  const handlePrint = () => {
    window.print();
  };

  // 실제 대화 내용만 필터링 (시스템 메시지 제외)
  const validMessages = chatMessages.filter(m => m.role !== 'system');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[75] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 print:p-0 print:bg-white"
    >
      {/* 화면에 보이는 안내창 (인쇄 시 숨김) */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative glass-strong rounded-[2rem] p-8 max-w-lg w-full shadow-2xl glow-border text-center space-y-6 print:hidden"
      >
        <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/20 transition-colors text-white">
          <X className="w-6 h-6" />
        </button>

        <div className="py-4">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-serif text-2xl font-bold text-white">프리미엄 상담 리포트</h3>
          <p className="text-primary/80 font-medium mt-2">{menuName}</p>
        </div>

        <div className="bg-white/5 rounded-2xl p-5 text-sm text-slate-300 space-y-2 text-left">
          <p className="flex justify-between"><span>상담사</span><span className="text-white font-bold">{counselorName}</span></p>
          <p className="flex justify-between"><span>내담자</span><span className="text-white font-bold">{userName}님</span></p>
          <p className="flex justify-between"><span>기록된 대화</span><span className="text-white font-bold">{validMessages.length}개</span></p>
        </div>

        <button
          onClick={handlePrint}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] hover:scale-[1.02] transition-all active:scale-95"
        >
          <Printer className="w-5 h-5" /> PDF 저장 및 인쇄하기
        </button>
        
        <p className="text-[11px] text-slate-400">
          💡 PDF로 저장 시 '배경 그래픽 포함'을 체크하시면 더 예쁘게 나옵니다.
        </p>
      </motion.div>

      {/* 📄 실제 인쇄되는 영역 (A4 사이즈 최적화) */}
      <div className="hidden print:block w-full bg-white text-slate-900 font-sans">
        <div className="max-w-[210mm] mx-auto p-[20mm] min-h-screen border-t-[10px] border-primary">
          {/* 리포트 헤더 */}
          <div className="flex justify-between items-start border-b-2 border-slate-100 pb-10 mb-10">
            <div>
              <p className="text-primary font-bold tracking-[0.3em] text-sm mb-2 uppercase text-purple-600">Premium Insight Report</p>
              <h1 className="text-4xl font-bold text-slate-800">{menuName}</h1>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-2 text-primary mb-1 text-purple-600">
                <Award className="w-5 h-5" />
                <span className="font-bold">Official KOK TAROT</span>
              </div>
              <p className="text-sm text-slate-400">{new Date().toLocaleDateString('ko-KR')} 발급</p>
            </div>
          </div>

          {/* 정보 박스 */}
          <div className="grid grid-cols-2 gap-4 mb-12">
            <div className="bg-slate-50 p-6 rounded-2xl">
              <p className="text-xs text-slate-400 mb-1">상담을 진행한 상담사</p>
              <p className="text-xl font-bold text-slate-700">{counselorName}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border-l-4 border-primary">
              <p className="text-xs text-slate-400 mb-1">상담을 받으신 내담자</p>
              <p className="text-xl font-bold text-slate-700">{userName}님</p>
            </div>
          </div>

          {/* 상담 내용 본문 */}
          <div className="space-y-8">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-l-4 border-primary pl-4 border-purple-600">
              상담 세부 리딩 기록
            </h2>
            
            <div className="space-y-6">
              {validMessages.map((msg, idx) => (
                <div key={idx} className={`p-6 rounded-2xl ${msg.role === 'bot' ? 'bg-slate-50 border border-slate-100' : 'bg-white border border-slate-100 ml-8'}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    {msg.role === 'bot' ? counselorName : userName}
                  </p>
                  <p className="text-base leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 푸터 */}
          <div className="mt-20 pt-10 border-t border-slate-100 text-center">
            <p className="text-sm font-bold text-slate-300 tracking-[0.5em] uppercase">Kok Tarot Experience</p>
            <p className="text-[10px] text-slate-300 mt-2">본 리포트는 개인의 운명적 참고 자료로만 활용하시기 바랍니다.</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-after: always; }
        }
      `}</style>
    </motion.div>
  );
}
