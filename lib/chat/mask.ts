// Design Ref: §2 민감 정보 가리기 — 외부로 나가기 전에 대화 전체에 적용한다.
// 표시 없이 쓴 호스트명(web01)처럼 찾을 수 없는 값이 있어, 입력 금지 안내와 함께 쓴다.
import { isIPv6 } from "node:net";

const IP = "[IP]";
const HOST = "[호스트명]";
const ACCOUNT = "[계정]";
const SECRET = "[비밀번호]";
const EMAIL = "[이메일]";
const PHONE = "[전화번호]";

const OCTET = "(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)";
const IPV4 = new RegExp(`(?<![\\d.])(?:${OCTET}\\.){3}${OCTET}(?![\\d.])`, "g");
const IPV6_CANDIDATE = /(?<![\w:.])[0-9a-f:]*:[0-9a-f:]*[0-9a-f](?![\w.])/gi;

const SECRET_VALUE =
  /([\w.-]*(?:password|passwd|pwd|secret|token|api[_-]?key)[\w-]*|비밀번호|암호|토큰)(\s*[:=]\s*)("[^"]*"|'[^']*'|\S+)/gi;
const BEARER = /\b(bearer\s+)\S+/gi;

const EMAIL_ADDRESS = /[\w.+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
const USER_AT_HOST = /(?<![\w.-])[a-z_][\w.-]*@(\[IP\]|[a-z0-9][\w.-]*)/gi;

const PHONE_NUMBER =
  /(?<![\d-])(?:(?:\+82[- ]?1\d|01\d)[- ]?\d{3,4}[- ]?\d{4}|0(?:2|[3-6]\d)-\d{3,4}-\d{4})(?![\d-])/g;

// "host: unreachable" 같은 에러 문구를 가리지 않도록, host의 값은 호스트명 모양일 때만 가린다.
const HOST_NAME_VALUE = /(?<![\w-])(hostname|호스트명|호스트)(\s*[:=]\s*)"?[\w.-]+"?/gi;
const HOST_VALUE = /(?<![\w-])(host)(\s*=\s*"?[\w.-]+"?|\s*:\s*"?[\w-]*[\d.-][\w.-]*"?)/gi;
const FQDN =
  /(?<![\w-])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:com|net|org|io|kr|local|internal|lan|corp|intranet)(?![\w-])/gi;

const ACCOUNT_VALUE = /(?<![\w-])(username|user|login|account|계정|사용자)(\s*[:=]\s*)\S+/gi;
const SSH_ACCOUNT = /\b((?:password|publickey) for (?:invalid user )?|invalid user )(?:\[계정\]|\S+)/gi;

// 서버가 이전 대화를 요청마다 다시 가리므로, 이미 가린 글자를 다시 넣어도 결과가 같아야 한다.
export function maskSensitive(text: string): string {
  return text
    .replace(SECRET_VALUE, `$1$2${SECRET}`)
    .replace(BEARER, `$1${SECRET}`)
    .replace(EMAIL_ADDRESS, EMAIL)
    .replace(IPV4, IP)
    .replace(IPV6_CANDIDATE, (match) => (isIPv6(match) ? IP : match))
    .replace(USER_AT_HOST, (_match, host: string) =>
      host === IP ? `${ACCOUNT}@${IP}` : `${ACCOUNT}@${HOST}`,
    )
    .replace(PHONE_NUMBER, PHONE)
    .replace(HOST_NAME_VALUE, `$1$2${HOST}`)
    .replace(HOST_VALUE, (match, key: string) =>
      `${key}${match.includes("=") ? "=" : ": "}${HOST}`,
    )
    .replace(FQDN, HOST)
    .replace(ACCOUNT_VALUE, `$1$2${ACCOUNT}`)
    .replace(SSH_ACCOUNT, `$1${ACCOUNT}`);
}
