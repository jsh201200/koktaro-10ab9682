import { motion } from 'framer-motion';
import { Printer, X } from 'lucide-react';

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

  // 📄 채팅 메시지를 페이지별로 분할 (10페이지)
  const totalMessages = chatMessages.filter(m => m.role !== 'system').length;
  const messagesPerPage = Math.ceil(totalMessages / 9); // 첫 페이지는 표지, 나머지 9페이지
  
  const getPageNumber = (messageIndex: number) => {
    return Math.floor(messageIndex / messagesPerPage) + 2; // 페이지 2부터 시작
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[75] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative glass-strong rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl glow-border space-y-4"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="text-center">
          <span className="text-3xl mb-2 block">📄</span>
          <h3 className="font-display text-lg font-bold text-foreground">프리미엄 리포트</h3>
          <p className="text-sm text-muted-foreground mt-2">{menuName} 상담 분석</p>
        </div>

        <div className="space-y-2 text-center text-sm text-muted-foreground">
          <p>상담사: {counselorName}</p>
          <p>고객명: {userName}</p>
          <p>총 {Math.min(10, Math.ceil(totalMessages / messagesPerPage) + 1)}페이지</p>
        </div>

        <button
          onClick={handlePrint}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
        >
          <Printer className="w-4 h-4" />
          📄 PDF로 저장 (인쇄)
        </button>

        <p className="text-[10px] text-muted-foreground text-center">
          💡 브라우저의 인쇄 기능 → PDF로 저장을 선택하면 PDF 파일로 다운로드됩니다
        </p>
      </motion.div>

      {/* 🖨️ Print 영역 (화면에서는 숨김, 인쇄할 때만 표시) */}
      <div id="premium-report" className="hidden print:block w-full print:w-screen print:h-screen print:bg-white">
        {/* =============== PAGE 1: 표지 =============== */}
        <div className="w-full h-screen bg-white p-12 flex flex-col justify-center items-center text-center print:break-after-page">
          <div className="mb-8">
            <span className="text-6xl">✨</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">콕타로</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-8">프리미엄 리포트</h2>
          
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-8 w-full max-w-md mb-8">
            <p className="text-sm text-gray-600 mb-2">상담 서비스</p>
            <p className="text-xl font-bold text-gray-900">{menuName}</p>
            <p className="text-sm text-gray-600 mt-4">상담사: {counselorName}</p>
          </div>

          <div className="mt-12 text-gray-700">
            <p className="text-lg font-semibold mb-2">{userName}님께</p>
            <p className="text-sm text-gray-600">당신의 운명을 읽어주는 전문 상담</p>
          </div>

          <div className="absolute bottom-8 text-center">
            <p className="text-xs text-gray-500">Official KOKK TAROT Report</p>
            <p className="text-xs text-gray-400 mt-2">
              발급일: {new Date().toLocaleDateString('ko-KR')}
            </p>
          </div>
        </div>

        {/* =============== PAGE 2-10: 상담 내용 =============== */}
        {chatMessages
          .filter(m => m.role !== 'system')
          .map((message, index) => {
            const pageNum = getPageNumber(index);
            const isNewPage = index > 0 && index % messagesPerPage === 0;

            return (
              <div
                key={message.id || index}
                className={`w-full min-h-screen bg-white p-12 flex flex-col ${
                  isNewPage ? 'print:break-before-page' : ''
                }`}
              >
                {/* 페이지 헤더 */}
                <div className="mb-6 pb-4 border-b-2 border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900">{menuName}</h3>
                  <p className="text-sm text-gray-600 mt-1">상담사: {counselorName}</p>
                </div>

                {/* 상담 내용 */}
                <div className="flex-1 mb-6">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base">
                    {message.content}
                  </p>
                </div>

                {/* 페이지 푸터 */}
                <div className="flex justify-between items-end pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    {userName} | {new Date().toLocaleDateString('ko-KR')}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Official Certification</div>
                      <div className="border-2 border-purple-200 rounded px-3 py-1">
                        <p className="text-[10px] font-bold text-purple-600">KOKK</p>
                        <p className="text-[8px] text-gray-600">AI Report</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{pageNum}/10</p>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </motion.div>
  );
}
