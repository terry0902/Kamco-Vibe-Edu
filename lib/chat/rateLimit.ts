// 서버 키 모드에서 남이 마음대로 써서 요금이 늘지 않게 하는 간단한 횟수 제한이다.
// 서버 메모리에만 두며(저장소 없음), 서버가 새로 뜨면 초기화되는 최선의 보호 장치다.
const WINDOW_MS = 10 * 60 * 1000;
export const MAX_REQUESTS_PER_WINDOW = 30;
const MAX_TRACKED = 1000;

const hits = new Map<string, number[]>();

export function isRateLimited(id: string, now = Date.now()): boolean {
  const recent = (hits.get(id) ?? []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  hits.set(id, recent);

  if (hits.size > MAX_TRACKED) {
    for (const [key, times] of hits) {
      if (times.every((time) => now - time >= WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > MAX_REQUESTS_PER_WINDOW;
}

export function resetRateLimit() {
  hits.clear();
}
