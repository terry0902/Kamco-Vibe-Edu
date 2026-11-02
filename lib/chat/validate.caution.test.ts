import { describe, expect, it, vi } from "vitest";
import { applyCaution, checkFirstPass } from "./validate";

vi.mock("server-only", () => ({}));

const caution = (text: string, marked = false) =>
  applyCaution([{ text, caution: marked }])[0].caution;

describe("applyCaution", () => {
  // Design Ref: §2 "주의" 판단 낱말 표의 표현
  it.each([
    "서버를 재부팅한다",
    "서버를 재기동한다",
    "리부트한다",
    "`reboot`를 실행한다",
    "`shutdown -r now`를 실행한다",
    "서비스를 중지한다",
    "서비스를 정지한다",
    "프로세스를 종료한다",
    "서비스를 재시작한다",
    "`systemctl stop nginx`를 실행한다",
    "`systemctl restart nginx`를 실행한다",
    "`kill -9 1234`를 실행한다",
    "파일을 삭제한다",
    "로그를 지운다",
    "로그를 지우기 전에 확인한다",
    "패키지를 제거한다",
    "`rm -rf /tmp/a`를 실행한다",
    "rm /tmp/a",
    "`kubectl delete pod a`를 실행한다",
    "`DROP TABLE a`를 실행한다",
    "`truncate -s 0 a.log`를 실행한다",
    "디스크를 포맷한다",
    "설정을 초기화한다",
    "`mkfs.ext4 /dev/sdb`를 실행한다",
    "`wipefs -a /dev/sdb`를 실행한다",
    "설정 변경 후 확인한다",
    "설정을 변경한다",
    "설정을 바꾼다",
    "로그를 지워 공간을 확보한다",
    "설정 파일을 연다",
    "`sysctl -w vm.swappiness=10`을 실행한다",
    "`chmod 600 a`를 실행한다",
    "`chown root a`를 실행한다",
    "config 값을 바꾼다",
  ])("%s 에 주의를 붙인다", (text) => {
    expect(caution(text)).toBe(true);
  });

  it.each([
    "`df -h`로 사용량을 확인한다",
    "`free -h`로 메모리를 확인한다",
    "`ip -br link`로 인터페이스를 확인한다",
    "`ifconfig`로 주소를 확인한다",
    "`kubectl describe pods a`로 이벤트를 확인한다",
    "`tail -n 50 /var/log/nginx/error.log`로 로그를 본다",
    "firmware 버전을 확인한다",
  ])("%s 에는 붙이지 않는다", (text) => {
    expect(caution(text)).toBe(false);
  });

  it("AI가 붙인 표시는 지우지 않는다", () => {
    expect(caution("케이블을 교체한다", true)).toBe(true);
  });
});

describe("checkFirstPass", () => {
  it("매뉴얼 답변에서 빠진 주의 표시를 채운다", () => {
    expect(
      checkFirstPass(
        {
          status: "answer",
          question: null,
          steps: [{ text: "로그를 삭제한다", caution: false }],
          sources: ["문서"],
        },
        [{ name: "문서", date: "2026-09-14", body: "본문" }],
        new Date("2026-11-02"),
      ),
    ).toMatchObject({
      ok: true,
      response: { steps: [{ text: "로그를 삭제한다", caution: true }] },
    });
  });
});
