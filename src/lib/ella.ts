// 10엘라 = 10,000원
// 1엘라 = 1,000원

export function wonToElla(won: number): number {
  return won / 1000;
}

export function formatElla(won: number): string {
  const ella = wonToElla(won);
  // 소수점 없으면 정수로
  return ella % 1 === 0 ? `${ella}엘라` : `${ella.toFixed(1)}엘라`;
}

// 결제 모달용: "19엘라 (19,000원)"
export function formatEllaWithWon(won: number): string {
  return `${formatElla(won)} (${won.toLocaleString()}원)`;
}
