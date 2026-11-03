"use client";

// 서버가 발표용 키 모드인지 한 번 물어본다. 확인 전에는 null이다.
import { useEffect, useState } from "react";

export function useServerKeyMode(): boolean | null {
  const [serverKey, setServerKey] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/mode", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { serverKey?: unknown }) => {
        if (active) setServerKey(body.serverKey === true);
      })
      .catch(() => {
        if (active) setServerKey(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return serverKey;
}
