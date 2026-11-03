"use client";

// 포인터 쪽으로 판을 살짝 기울이고, 각 유리 조각 안에 커서 빛(은은한 보라색)을 따라 붙인다.
import { useEffect, type RefObject } from "react";

export function useGlassPointer(stageRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let latest: PointerEvent | null = null;

    const reset = () => {
      stage.style.setProperty("--rx", "0deg");
      stage.style.setProperty("--ry", "0deg");
      stage.querySelectorAll<HTMLElement>(".glass").forEach((element) => {
        element.style.setProperty("--glow", "0");
      });
    };

    const apply = () => {
      frame = 0;
      if (!latest) return;
      const x = (latest.clientX / window.innerWidth) * 2 - 1;
      const y = (latest.clientY / window.innerHeight) * 2 - 1;
      stage.style.setProperty("--ry", `${x * 2.2 - 0.3}deg`);
      stage.style.setProperty("--rx", `${-y * 1.8 + 0.2}deg`);
      stage.querySelectorAll<HTMLElement>(".glass").forEach((element) => {
        const rect = element.getBoundingClientRect();
        element.style.setProperty("--gx", `${latest!.clientX - rect.left}px`);
        element.style.setProperty("--gy", `${latest!.clientY - rect.top}px`);
        element.style.setProperty("--glow", "1");
      });
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      latest = event;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      latest = null;
      reset();
    };

    window.addEventListener("pointermove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [stageRef]);
}
