"use client";

// 시작 화면: 매뉴얼에서 조치를 찾아 검토 후 적용하게 안내하는 흐름을 아이콘 3개와 빛줄기로 보여 준다.
import { useEffect, useRef, useState } from "react";

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

const SYMPTOMS = [
  {
    label: "디스크",
    icon: (
      <>
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
        <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </>
    ),
  },
  {
    label: "메모리",
    icon: (
      <>
        <rect x="3" y="7" width="18" height="10" rx="1" />
        <path d="M7 17v3M11 17v3M15 17v3M19 17v3M7 4v3M11 4v3M15 4v3M19 4v3" />
      </>
    ),
  },
  {
    label: "네트워크",
    icon: (
      <>
        <circle cx="12" cy="5" r="2.5" />
        <circle cx="5" cy="19" r="2.5" />
        <circle cx="19" cy="19" r="2.5" />
        <path d="M12 7.5v4M12 11.5l-6 5.5M12 11.5l6 5.5" />
      </>
    ),
  },
  {
    label: "웹 서비스",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3z" />
      </>
    ),
  },
  {
    label: "방화벽",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="1" />
        <path d="M3 10h18M3 15h18M9 5v5M15 10v5M9 15v4" />
      </>
    ),
  },
];

type StartHeroProps = {
  needsApiKey: boolean;
  keyDisabled?: boolean;
  onStart: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
};

export default function StartHero({
  needsApiKey,
  keyDisabled = false,
  onStart,
  onOpenHistory,
  onOpenSettings,
}: StartHeroProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const pipelineRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const shieldRef = useRef<HTMLDivElement>(null);
  const glowPathRef = useRef<SVGPathElement>(null);
  const corePathRef = useRef<SVGPathElement>(null);
  const gradientRef = useRef<SVGLinearGradientElement>(null);
  const splashRef = useRef<HTMLDivElement>(null);

  // 휴대폰 메뉴가 열려 있는 동안에는 뒤 화면이 스크롤되지 않게 한다.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const pipeline = pipelineRef.current;
    const stack = stackRef.current;
    const center = centerRef.current;
    const shield = shieldRef.current;
    const glowPath = glowPathRef.current;
    const corePath = corePathRef.current;
    const gradient = gradientRef.current;
    const splash = splashRef.current;
    if (!pipeline || !stack || !center || !shield || !glowPath || !corePath || !gradient || !splash) {
      return;
    }

    // 세 아이콘의 가운데를 이어 빛줄기가 지나갈 길을 만든다.
    function updatePath() {
      const pRect = pipeline!.getBoundingClientRect();
      const point = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2 - pRect.left,
          y: rect.top + rect.height / 2 - pRect.top,
        };
      };
      const start = point(stack!);
      const mid = point(center!);
      const end = point(shield!);
      const d = `M ${start.x},${start.y} L ${mid.x},${mid.y} L ${end.x},${end.y}`;
      glowPath!.setAttribute("d", d);
      corePath!.setAttribute("d", d);
    }

    updatePath();
    window.addEventListener("resize", updatePath);

    // 움직임 줄이기를 켠 경우에는 빛줄기를 움직이지 않는다.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      glowPath.style.opacity = "0";
      corePath.style.opacity = "0";
      return () => window.removeEventListener("resize", updatePath);
    }

    function setWindow(percentage: number) {
      const centerPercent = percentage * 100;
      gradient!.setAttribute("x1", `${centerPercent - 5}%`);
      gradient!.setAttribute("x2", `${centerPercent + 5}%`);
      gradient!.setAttribute("y1", "0%");
      gradient!.setAttribute("y2", "0%");
    }
    function setPathsVisible(visible: boolean) {
      glowPath!.style.opacity = visible ? "0.6" : "0";
      corePath!.style.opacity = visible ? "1" : "0";
    }

    type Phase = "p1" | "splash" | "p2" | "idle";
    let phase: Phase = "p1";
    let lastStateChange = performance.now();
    let frameId = 0;

    function frame(now: number) {
      const elapsed = now - lastStateChange;
      switch (phase) {
        case "p1": {
          const p = Math.min(elapsed / 800, 1);
          setWindow(p * 0.5);
          stack!.classList.toggle("active", p < 0.4);
          if (elapsed >= 800) {
            phase = "splash";
            lastStateChange = now;
            stack!.classList.remove("active");
            setPathsVisible(false);
            splash!.classList.add("animate");
          }
          break;
        }
        case "splash":
          if (elapsed >= 800) {
            phase = "p2";
            lastStateChange = now;
            splash!.classList.remove("animate");
            setPathsVisible(true);
          }
          break;
        case "p2": {
          const p = Math.min(elapsed / 800, 1);
          setWindow(0.5 + p * 0.5);
          shield!.classList.toggle("active", p > 0.6);
          if (elapsed >= 800) {
            phase = "idle";
            lastStateChange = now;
            shield!.classList.remove("active");
          }
          break;
        }
        case "idle":
          if (elapsed >= 1000) {
            phase = "p1";
            lastStateChange = now;
          }
          break;
      }
      frameId = requestAnimationFrame(frame);
    }
    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updatePath);
    };
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleStart() {
    if (needsApiKey) onOpenSettings();
    else onStart();
  }

  const startLabel = needsApiKey ? "API 키 설정하고 시작" : "시작하기";

  return (
    <div className="start-screen" role="region" aria-label="시작 화면">
      <nav>
        <span className="nav-logo">장애 대응 도우미</span>
        <button
          type="button"
          className={`menu-toggle${menuOpen ? " active" : ""}`}
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
        <div className={`nav-menu${menuOpen ? " active" : ""}`}>
          <ul className="nav-links">
            <li>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  setGuideOpen(true);
                }}
              >
                사용 방법
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  onOpenHistory();
                }}
              >
                대화 기록
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  onOpenSettings();
                }}
              >
                매뉴얼 폴더
              </button>
            </li>
          </ul>
          <div className="nav-actions">
            {!keyDisabled && (
              <button
                type="button"
                className="btn-login"
                onClick={() => {
                  closeMenu();
                  onOpenSettings();
                }}
              >
                API 키
              </button>
            )}
            <button
              type="button"
              className="btn-signup"
              onClick={() => {
                closeMenu();
                handleStart();
              }}
            >
              {needsApiKey ? "시작하기" : "질문하기"}
            </button>
          </div>
        </div>
      </nav>

      <section className="hero-card">
        <div className="hero-grid" />

        <div className="icon-pipeline" ref={pipelineRef} aria-hidden="true">
          <svg className="beam-svg">
            <defs>
              <filter
                id="start-glow"
                filterUnits="userSpaceOnUse"
                x="-10%"
                y="-200%"
                width="120%"
                height="500%"
              >
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient
                id="start-beam-gradient"
                gradientUnits="userSpaceOnUse"
                ref={gradientRef}
                x1="-5%"
                x2="5%"
                y1="0%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#b04090" stopOpacity="0" />
                <stop offset="20%" stopColor="#b04090" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#fff" stopOpacity="1" />
                <stop offset="80%" stopColor="#c8a0e0" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#c8a0e0" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              ref={glowPathRef}
              fill="none"
              stroke="url(#start-beam-gradient)"
              strokeWidth="2"
              filter="url(#start-glow)"
              style={{ opacity: 0.6 }}
            />
            <path
              ref={corePathRef}
              fill="none"
              stroke="url(#start-beam-gradient)"
              strokeWidth="0.8"
            />
          </svg>

          <div className="icon-node node-light-right" ref={stackRef}>
            <svg viewBox="0 0 24 24">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>

          <div className="pipeline-line" />

          <div className="center-wrap">
            <div className="splash" ref={splashRef} />
            <div className="icon-node-center" ref={centerRef}>
              <svg viewBox="0 0 40 40">
                <circle cx="17" cy="17" r="10" />
                <line x1="25" y1="25" x2="34" y2="34" />
              </svg>
            </div>
          </div>

          <div className="pipeline-line right" />

          <div className="icon-node node-light-left" ref={shieldRef}>
            <svg viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>
        </div>

        <div className="hero-content">
          <h1 className="hero-heading">
            증상만 입력하면
            <strong>조치 방법을 찾아요</strong>
          </h1>
          <p className="hero-sub">
            운영 매뉴얼에서 조치 방법과 출처를 찾고,
            <br />
            매뉴얼에 없을 때만 인터넷에서 찾아 안내합니다.
          </p>
          <button type="button" className="btn-cta" onClick={handleStart}>
            {startLabel}
          </button>
        </div>
      </section>

      <p className="hero-note">
        이 앱은 서버에 접속하거나 명령을 실행하지 않고 안내만 합니다.
      </p>

      <div className="brands" aria-label="자주 찾는 장애 유형">
        {SYMPTOMS.map((item) => (
          <div className="brand-item" key={item.label}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {item.icon}
            </svg>
            {item.label}
          </div>
        ))}
      </div>

      {guideOpen && (
        <div className="guide-overlay" role="dialog" aria-label="사용 방법">
          <button type="button" className="guide-back" onClick={() => setGuideOpen(false)}>
            ← 뒤로
          </button>
          <div className="guide-inner">
            <h2>사용 방법을 다섯 가지로.</h2>
            {GUIDE_TERMS.map((item) => (
              <p key={item.term}>
                <b>{item.term}</b> — {item.text}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
