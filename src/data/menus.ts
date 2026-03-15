export interface Menu {
  id: number;
  category: 'A' | 'B' | 'C' | 'D';
  categoryName: string;
  name: string;
  icon: string;
  desc: string;
  detailDesc: string;
  price: number;
}

export const MENUS: Menu[] = [
  { id: 1, category: 'A', categoryName: '입구', name: '성명학', icon: '✍️', desc: '이름에 숨겨진 기운 분석', detailDesc: '한자 이름의 획수와 오행을 계산하여 타고난 기운과 성격을 팩폭합니다.', price: 4900 },
  { id: 2, category: 'A', categoryName: '입구', name: '관상/손금', icon: '👁️', desc: '얼굴과 손에 새겨진 운명', detailDesc: '얼굴 특징이나 손금 모양으로 현재 운의 흐름을 분석합니다.', price: 4900 },
  { id: 3, category: 'A', categoryName: '입구', name: 'MBTI 심리', icon: '🧠', desc: '동양 오행과 만난 MBTI', detailDesc: 'MBTI 유형을 음양오행과 결합한 현대판 사주 풀이입니다.', price: 4900 },
  { id: 4, category: 'B', categoryName: '메인', name: '사주', icon: '☀️', desc: '인생의 거대한 설계도', detailDesc: '태어난 달의 계절적 기운을 중심으로 인생 설계도와 대운을 분석합니다.', price: 19000 },
  { id: 5, category: 'B', categoryName: '메인', name: '타로', icon: '🃏', desc: '선택의 기로에서 명확한 가이드', detailDesc: '현재 상황의 주파수를 읽고 선택의 기로에서 가이드를 제시합니다.', price: 19000 },
  { id: 6, category: 'B', categoryName: '메인', name: '수비학', icon: '🔢', desc: '숫자로 읽는 영혼의 코드', detailDesc: '생년월일 숫자 조합으로 영혼의 번호와 인생 로직을 해석합니다.', price: 19000 },
  { id: 7, category: 'B', categoryName: '메인', name: '자미두수', icon: '⭐', desc: '별자리 운명 디코딩', detailDesc: '밤하늘의 별자리 배치를 보듯 섬세하게 운명을 디코딩합니다.', price: 19000 },
  { id: 8, category: 'C', categoryName: '스페셜', name: '기문둔갑', icon: '🚪', desc: '막힌 운을 뚫는 개운 전략', detailDesc: '현재 막힌 운을 뚫기 위한 시공간적 개운 전략을 제시합니다.', price: 29000 },
  { id: 9, category: 'C', categoryName: '스페셜', name: '육효', icon: '🎲', desc: 'Yes/No 괘 분석', detailDesc: '지금 당장 결정해야 하는 질문에 대한 Yes/No 괘를 분석합니다.', price: 29000 },
  { id: 10, category: 'C', categoryName: '스페셜', name: '호라리', icon: '🪐', desc: '사건의 결말 예측', detailDesc: '질문 탄생 순간의 행성 배치로 사건의 결말을 예측합니다.', price: 29000 },
  { id: 11, category: 'C', categoryName: '스페셜', name: '연애', icon: '💕', desc: '상대의 속마음 분석', detailDesc: '도덕적 판단 없이 상대의 본능적 속마음과 재회 가능성을 분석합니다.', price: 29000 },
  { id: 12, category: 'C', categoryName: '스페셜', name: '펫타로', icon: '🐾', desc: '반려동물의 속마음', detailDesc: '반려동물과 주파수를 맞춰 아이가 전하고 싶은 메시지를 전달합니다.', price: 29000 },
  { id: 13, category: 'C', categoryName: '스페셜', name: '진로/재물', icon: '💰', desc: '성공 방정식과 재물 시기', detailDesc: '성공 방정식을 찾고 언제 돈이 들어올지 구체적 시기를 리딩합니다.', price: 29000 },
  { id: 14, category: 'C', categoryName: '스페셜', name: '작명/개명', icon: '📝', desc: '운명을 리브랜딩하는 이름', detailDesc: '부족한 오행을 채워 운명을 리브랜딩하는 이름을 추천합니다.', price: 29000 },
  { id: 15, category: 'C', categoryName: '스페셜', name: '꿈해몽', icon: '🌙', desc: '무의식의 메시지 해부', detailDesc: '무의식이 보내는 경고나 예지몽을 심리학적으로 해부합니다.', price: 29000 },
  { id: 16, category: 'D', categoryName: '프리미엄', name: '종합운명분석', icon: '💎', desc: '하울의 심층 리포트', detailDesc: '추가 질문 2개에 대해 하울이 직접 심층 분석 리포트를 작성합니다.', price: 59000 },
];

export const CATEGORY_LABELS: Record<string, string> = {
  A: '입구 · 본질 분석',
  B: '메인 · 심층 리딩',
  C: '스페셜 · 특정 고민',
  D: '프리미엄',
};
