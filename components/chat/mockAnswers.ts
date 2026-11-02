// 작업 4의 임시 답변이다. 작업 7에서 서버 API를 연결하면 이 파일을 대체한다.
import type { ChatResponse } from "@/lib/chat/types";

export type MockResult =
  | { ok: true; response: ChatResponse }
  | { ok: false; message: string };

const source = {
  name: "디스크 용량 부족 대응 매뉴얼",
  date: "2026-09-14",
  outdated: false,
};

// 카드 7종을 모두 확인할 수 있도록 보낼 때마다 다음 종류를 돌려준다.
export const MOCK_RESULTS: MockResult[] = [
  {
    ok: true,
    response: {
      kind: "manual",
      steps: [
        { text: "df -h로 가득 찬 파일시스템을 확인한다.", caution: false },
        { text: "du로 용량을 많이 쓰는 폴더를 찾는다.", caution: false },
        { text: "압축된 지난 로그를 삭제한다.", caution: true },
        { text: "df -h로 사용률이 내려갔는지 확인한다.", caution: false },
      ],
      sources: [
        source,
        {
          name: "RAID 디스크 장애 대응 매뉴얼",
          date: "2025-02-18",
          outdated: true,
        },
      ],
      followUp: false,
    },
  },
  {
    ok: true,
    response: {
      kind: "conflict",
      versions: [
        {
          name: "서버 과열 대응 매뉴얼",
          date: "2026-06-10",
          outdated: false,
          steps: [
            { text: "85도 이상이면 작업을 다른 서버로 옮긴다.", caution: false },
            { text: "shutdown -h now로 서버를 종료한다.", caution: true },
          ],
        },
        {
          name: "서버실 온도 경보 조치 지침",
          date: "2026-03-22",
          outdated: false,
          steps: [
            { text: "90도 이상이면 즉시 서버를 종료한다.", caution: true },
            { text: "시설 담당자에게 냉방 점검을 요청한다.", caution: false },
          ],
        },
      ],
    },
  },
  {
    ok: true,
    response: {
      kind: "clarify",
      question: "어느 장비에서 어떤 에러 메시지가 나오나요?",
    },
  },
  { ok: true, response: { kind: "escalate" } },
  {
    ok: true,
    response: {
      kind: "web",
      steps: [
        { text: "kubectl describe pods로 이벤트를 확인한다.", caution: false },
        { text: "문제가 된 파드를 재시작한다.", caution: true },
      ],
      links: [
        {
          title: "Kubernetes: Debug Pods",
          url: "https://kubernetes.io/docs/tasks/debug/debug-application/debug-pods/",
        },
      ],
      followUp: true,
    },
  },
  { ok: true, response: { kind: "notFound", followUp: false } },
  {
    ok: false,
    message: "답변을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.",
  },
];
