"use client";

// 시작 화면: 어두운 유리 조각 위에 안내가 찍혀 있고, "사용 방법"을 누르면 조각이 깨져 안내 화면이 나온다.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  COLORS,
  sliverGeometry,
  type ActionId,
  type PageLayout,
} from "./glassLayout";
import type { GlassScene } from "./glassScene";

const GUIDE_TERMS = [
  {
    term: "증상 입력",
    text: "증상이나 에러 메시지를 입력창에 적습니다. 실제 IP 주소, 호스트명, 계정, 비밀번호는 넣지 마세요.",
  },
  {
    term: "조치 방법 확인",
    text: "운영 매뉴얼에서 찾은 조치를 근거 문서와 함께 최대 5단계로 안내합니다.",
  },
  {
    term: "인터넷 검색",
    text: "매뉴얼에 없을 때만 인터넷에서 찾고, 출처 링크가 있는 내용만 보여 줍니다. 매뉴얼 밖의 정보이므로 검토 후 적용하세요.",
  },
  {
    term: "직접 조치",
    text: "이 앱은 안내만 합니다. 서버 접속과 명령 실행은 담당자가 직접 합니다. 해결되지 않으면 결과를 다시 입력해 다른 방법을 찾습니다.",
  },
  {
    term: "저장 위치",
    text: "대화와 API 키는 이 브라우저에만 저장되고, 이 앱의 서버에는 남지 않습니다.",
  },
];

type GlassHeroProps = {
  needsApiKey: boolean;
  onStart: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
};

type Mode = "loading" | "webgl" | "static";

export default function GlassHero({
  needsApiKey,
  onStart,
  onOpenHistory,
  onOpenSettings,
}: GlassHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GlassScene | null>(null);
  const needsApiKeyRef = useRef(needsApiKey);
  const [mode, setMode] = useState<Mode>("loading");
  const [layout, setLayout] = useState<PageLayout | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [guideMounted, setGuideMounted] = useState(false);
  const [guideShown, setGuideShown] = useState(false);
  const [viewport, setViewport] = useState({ w: 1440, h: 900 });
  const [backHover, setBackHover] = useState(false);

  useEffect(() => {
    needsApiKeyRef.current = needsApiKey;
    sceneRef.current?.update({ needsApiKey, hover });
  }, [needsApiKey, hover]);

  useEffect(() => {
    let disposed = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    async function start() {
      if (reduced) {
        setMode("static");
        return;
      }
      try {
        const { createGlassScene } = await import("./glassScene");
        if (disposed || !canvasRef.current) return;
        sceneRef.current = createGlassScene({
          canvas: canvasRef.current,
          getTextLayer: () => layerRef.current,
          needsApiKey: needsApiKeyRef.current,
          onLayout: setLayout,
        });
        setMode("webgl");
      } catch {
        // WebGL을 쓸 수 없으면 정적인 화면으로 대신한다.
        setMode("static");
      }
    }
    void start();

    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  const openGuide = useCallback(() => {
    setGuideMounted(true);
    if (sceneRef.current) {
      sceneRef.current.shatter();
      // 조각이 날아가기 시작한 뒤에 안내가 나타난다.
      window.setTimeout(() => setGuideShown(true), 280);
    } else {
      setGuideShown(true);
    }
  }, []);

  const closeGuide = useCallback(() => {
    setGuideShown(false);
    setBackHover(false);
    sceneRef.current?.setSliverHover(false);
    sceneRef.current?.assemble();
    window.setTimeout(() => setGuideMounted(false), 250);
  }, []);

  useEffect(() => {
    if (!guideMounted) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeGuide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guideMounted, closeGuide]);

  function runAction(action: ActionId) {
    if (action === "guide") openGuide();
    else if (action === "history") onOpenHistory();
    else if (action === "settings") onOpenSettings();
    else if (needsApiKey) onOpenSettings();
    else onStart();
  }

  const sliver = sliverGeometry(viewport.w, viewport.h);
  const guideStyle = {
    left: viewport.w < 640 ? "6%" : "32.4%",
    width: viewport.w < 640 ? "88%" : "33.9%",
    top: viewport.w < 640 ? "22%" : "max(35.9vh, 130px)",
  };

  return (
    <div
      role="region"
      aria-label="시작 화면"
      className="glass-hero fixed inset-0 z-40 overflow-hidden bg-[#050507] text-white"
    >
      <h1 className="sr-only">서버 장애 대응 도우미</h1>

      {mode !== "static" && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
        />
      )}

      {mode === "webgl" && layout && (
        <div
          ref={layerRef}
          className="glass-text-layer"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: layout.bw,
            height: layout.bh,
            transformOrigin: "0 0",
            visibility: "hidden",
          }}
        >
          {layout.items.map((item) => {
            const style = {
              position: "absolute" as const,
              left: item.x,
              top: item.y,
              width: item.w,
              height: item.h,
              fontSize: item.size,
              fontWeight: item.weight,
              letterSpacing: `${item.tracking}em`,
              lineHeight: `${item.h}px`,
              textAlign: item.align,
              whiteSpace: "nowrap" as const,
              color: "transparent",
            };
            if (item.action) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => runAction(item.action!)}
                  onPointerEnter={() => setHover(item.id)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(item.id)}
                  onBlur={() => setHover(null)}
                  className="glass-text-button"
                  style={{ ...style, cursor: "pointer" }}
                >
                  {item.text}
                </button>
              );
            }
            return (
              <div key={item.id} style={style}>
                {item.text}
              </div>
            );
          })}
        </div>
      )}

      {mode === "static" && (
        <StaticHero
          needsApiKey={needsApiKey}
          onAction={runAction}
          hidden={guideMounted}
        />
      )}

      {guideMounted && (
        <>
          <section
            aria-label="사용 방법"
            className="absolute overflow-y-auto"
            style={{
              ...guideStyle,
              maxHeight: "60vh",
              opacity: guideShown ? 1 : 0,
              transition: `opacity ${guideShown ? 0.4 : 0.25}s ease`,
            }}
          >
            <h2
              className="font-semibold text-white"
              style={{
                fontSize: "max(1.36vw, 20px)",
                letterSpacing: "-0.022em",
                marginBottom: "max(1.05vw, 14px)",
              }}
            >
              사용 방법을 다섯 가지로.
            </h2>
            <div
              className="flex flex-col"
              style={{ gap: "max(1.05vw, 14px)", fontSize: "max(0.73vw, 14px)" }}
            >
              {GUIDE_TERMS.map((item) => (
                <p
                  key={item.term}
                  style={{ lineHeight: 1.72, color: "rgba(255,255,255,.6)" }}
                >
                  <b className="font-semibold text-white">{item.term}</b> — {item.text}
                </p>
              ))}
            </div>
          </section>

          {mode === "static" ? (
            <button
              type="button"
              onClick={closeGuide}
              className="absolute left-4 top-4 rounded-md border border-white/20 px-3 py-1.5 text-sm text-white hover:text-[#b9abff]"
            >
              ← 뒤로
            </button>
          ) : (
            <button
              type="button"
              onClick={closeGuide}
              onPointerEnter={() => {
                setBackHover(true);
                sceneRef.current?.setSliverHover(true);
              }}
              onPointerLeave={() => {
                setBackHover(false);
                sceneRef.current?.setSliverHover(false);
              }}
              onFocus={() => setBackHover(true)}
              onBlur={() => setBackHover(false)}
              className="absolute font-medium"
              style={{
                left: sliver.labelX,
                top: sliver.labelY,
                transform: "translate(-50%, -50%)",
                padding: "10px 22px",
                fontSize: "max(0.66vw, 14px)",
                color: backHover ? COLORS.lavender : "#fff",
                opacity: guideShown ? 1 : 0,
                transition: "opacity .3s ease, color .15s ease",
                whiteSpace: "nowrap",
              }}
            >
              ← 뒤로
            </button>
          )}
        </>
      )}
    </div>
  );
}

// WebGL을 쓸 수 없거나 움직임 줄이기를 켠 환경에서 보여 주는 정적인 화면이다.
function StaticHero({
  needsApiKey,
  onAction,
  hidden,
}: {
  needsApiKey: boolean;
  onAction: (action: ActionId) => void;
  hidden: boolean;
}) {
  return (
    <div
      className="absolute inset-0 flex flex-col gap-3.5 p-4 sm:p-[5.5%]"
      style={{ visibility: hidden ? "hidden" : "visible" }}
    >
      <nav className="glass flex items-center justify-between rounded-[20px] px-6 py-4 text-sm">
        <span className="font-semibold">장애 대응 도우미</span>
        <span className="flex gap-6 text-white/60">
          <button type="button" onClick={() => onAction("history")} className="hover:text-white">
            대화 기록
          </button>
          <button type="button" onClick={() => onAction("settings")} className="hover:text-white">
            설정
          </button>
        </span>
      </nav>
      <section className="glass flex flex-1 flex-col justify-center gap-6 rounded-[20px] px-6 py-8 sm:px-[5.5%]">
        <p className="text-xs tracking-[0.2em] text-white/40">SERVER INCIDENT HELPER</p>
        <h2 className="text-[clamp(2rem,7vw,4.5rem)] font-medium leading-[0.97] tracking-[-0.045em] text-zinc-200">
          어떤 장애가
          <br />
          발생했나요?
        </h2>
        <p className="max-w-xl text-[15px] leading-7 text-white/55">
          증상이나 에러 메시지를 알려 주시면 운영 매뉴얼에서 조치 방법과 출처를 찾아 드립니다.
          매뉴얼에 없으면 인터넷에서 찾습니다.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <button
            type="button"
            onClick={() => onAction("start")}
            className="h-11 rounded-md bg-[#e9e9ed] px-5 text-sm font-medium text-[#0b0b0d] hover:bg-[#36d67e]"
          >
            {needsApiKey ? "API 키 설정" : "질문 시작하기"}
          </button>
          <button
            type="button"
            onClick={() => onAction("guide")}
            className="text-sm text-white/70 hover:text-white hover:underline"
          >
            사용 방법 →
          </button>
        </div>
      </section>
    </div>
  );
}
