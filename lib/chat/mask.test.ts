import { describe, expect, it } from "vitest";
import { maskSensitive } from "./mask";

describe("maskSensitive", () => {
  // Design Ref: §2 민감 정보 가리기 표의 예
  it.each([
    ["192.168.0.10", "[IP]"],
    ["fe80::1", "[IP]"],
    ["web01.corp.example.com", "[호스트명]"],
    ["hostname: web01", "hostname: [호스트명]"],
    ["host=web01", "host=[호스트명]"],
    ["root@web01", "[계정]@[호스트명]"],
    ["user=admin", "user=[계정]"],
    ["login: admin", "login: [계정]"],
    ["계정: admin", "계정: [계정]"],
    ["password=abc123", "password=[비밀번호]"],
    ["pwd: abc123", "pwd: [비밀번호]"],
    ["비밀번호: abc123", "비밀번호: [비밀번호]"],
    ["token=abc123", "token=[비밀번호]"],
    ["name@example.com", "[이메일]"],
    ["010-1234-5678", "[전화번호]"],
  ])("%s 를 가린다", (input, expected) => {
    expect(maskSensitive(input)).toBe(expected);
  });

  it.each([
    ["root@192.168.0.10", "[계정]@[IP]"],
    ["[root@web01 ~]# df -h", "[[계정]@[호스트명] ~]# df -h"],
    ["connect to 10.0.0.1:8080 failed", "connect to [IP]:8080 failed"],
    ["2001:db8::8a2e:370:7334: timed out", "[IP]: timed out"],
    ["01012345678", "[전화번호]"],
    ["02-123-4567", "[전화번호]"],
    ["DB_PASSWORD=abc123", "DB_PASSWORD=[비밀번호]"],
    ['password: "my secret"', "password: [비밀번호]"],
    ["Authorization: Bearer abc.def", "Authorization: Bearer [비밀번호]"],
    ["username=admin password=abc", "username=[계정] password=[비밀번호]"],
    ["host: web-01", "host: [호스트명]"],
    ["Failed password for root from 10.0.0.1", "Failed password for [계정] from [IP]"],
    ["Invalid user admin from 10.0.0.1", "Invalid user [계정] from [IP]"],
    ["https://web01.example.co.kr/health", "https://[호스트명]/health"],
  ])("실제 로그 형태 %s 를 가린다", (input, expected) => {
    expect(maskSensitive(input)).toBe(expected);
  });

  it("여러 줄의 값을 모두 가린다", () => {
    expect(maskSensitive("a 10.0.0.1\nb 10.0.0.2\nname@example.com")).toBe(
      "a [IP]\nb [IP]\n[이메일]",
    );
  });

  // 에러의 의미를 해치지 않도록 그대로 둔다.
  it.each([
    "nginx.service",
    "libc.so.6",
    "kernel.panic",
    "/var/log/nginx/error.log",
    "ECONNREFUSED",
    "No space left on device",
    "ssh: connect to host: Connection refused",
    "No route to host",
    "12:34:56 CUDA error",
    "std::bad_alloc",
    "nginx/1.24.0",
    "2026-11-02",
    "502 Bad Gateway",
    "pid 1234567890",
    "waiting for response from server",
    "999.1.1.1",
    "docker.service: Main process exited",
  ])("%s 는 그대로 둔다", (input) => {
    expect(maskSensitive(input)).toBe(input);
  });

  it("이미 가린 글자를 다시 가려도 결과가 같다", () => {
    const once = maskSensitive(
      "root@web01 user=admin password=x host=web01 hostname: a Failed password for root from 10.0.0.1 name@example.com 010-1234-5678 fe80::1 web01.example.com Bearer abc",
    );
    expect(maskSensitive(once)).toBe(once);
  });

  // 알려진 한계: 표시 없는 호스트명과 문장 속 비밀번호는 찾지 못한다.
  it.each(["web01 서버가 죽었어요", "비밀번호는 abc123 입니다"])(
    "한계: %s 는 찾지 못한다",
    (input) => {
      expect(maskSensitive(input)).toBe(input);
    },
  );
});
