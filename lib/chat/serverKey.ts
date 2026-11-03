// 발표용 임시 모드: 서버에 설정된 키로 답한다. 로그인이 없는 공개 주소에서는 키를 가진 쪽에 요금이 청구되므로, 평소에는 꺼 둔다.
import "server-only";
import { isApiKeyFormatValid } from "./types";

export function isServerKeyMode(): boolean {
  return process.env.SERVER_KEY_MODE === "true";
}

// 형식이 맞지 않거나 없으면 빈 문자열을 돌려준다. 키 값은 로그나 응답에 쓰지 않는다.
export function getServerKey(): string {
  const key = (process.env.OPENAI_API_KEY ?? "").trim();
  return isApiKeyFormatValid(key) ? key : "";
}
