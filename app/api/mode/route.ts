// 화면이 키 입력을 보여 줄지 정하도록, 서버 키 모드인지만 알려 준다. 키 값은 절대 내보내지 않는다.
import { connection } from "next/server";
import { isServerKeyMode } from "@/lib/chat/serverKey";

export async function GET() {
  // 빌드할 때 값이 굳지 않도록 요청마다 읽는다.
  await connection();
  return Response.json({ serverKey: isServerKeyMode() });
}
