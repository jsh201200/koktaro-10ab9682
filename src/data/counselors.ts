export interface Counselor {
  id: string;
  name: string;
  title: string;
  age: string;
  gender: string;
  specialty: string;
  image: string;
  menuIds: number[];
  color: string;
}

export const COUNSELORS: Counselor[] = [
  {
    id: 'ian',
    name: '이안',
    title: '냉철한 투자 전문가',
    age: '30대',
    gender: '남',
    specialty: '재물/진로',
    image: '/counselors/ian.jpg',
    menuIds: [6, 8, 13],
    color: '#1a365d',
  },
  {
    id: 'jihan',
    name: '지한',
    title: '잔망스러운 남사친',
    age: '20대',
    gender: '남',
    specialty: '연애/MBTI',
    image: '/counselors/jihan.jpg',
    menuIds: [3, 11, 15],
    color: '#6B21A8',
  },
  {
    id: 'song',
    name: '송선생',
    title: '품격 있는 인생 멘토',
    age: '50대',
    gender: '남',
    specialty: '사주/정통',
    image: '/counselors/song.jpg',
    menuIds: [4, 7, 9, 10],
    color: '#44403c',
  },
  {
    id: 'luna',
    name: '루나',
    title: '몽환적인 요정',
    age: '20대',
    gender: '여',
    specialty: '타로/신비',
    image: '/counselors/luna.jpg',
    menuIds: [0, 5, 12],
    color: '#7c3aed',
  },
  {
    id: 'suhyun',
    name: '수현',
    title: '공감형 힐러',
    age: '30대',
    gender: '여',
    specialty: '심리/위로',
    image: '/counselors/suhyun.jpg',
    menuIds: [1, 14],
    color: '#b45309',
  },
  {
    id: 'myunghwa',
    name: '명화',
    title: '팩트 폭격 해결사',
    age: '50대',
    gender: '여',
    specialty: '관상/카리스마',
    image: '/counselors/myunghwa.jpg',
    menuIds: [2, 16],
    color: '#1e293b',
  },
];

export function getCounselorForMenu(menuId: number): Counselor {
  return COUNSELORS.find(c => c.menuIds.includes(menuId)) || COUNSELORS[3]; // default: luna
}
