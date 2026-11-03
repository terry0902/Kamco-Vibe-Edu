// 유리 조각 시작 화면의 배치와 글자 그리기. 3D 장면과 화면 글자 레이어가 같은 값을 쓰도록 한곳에 둔다.

export type ActionId = "history" | "guide" | "settings" | "start";

export type Rect = { x: number; y: number; w: number; h: number };

export type TextItem = {
  id: string;
  text: string;
  // 페이지 블록 안의 위치(px)
  x: number;
  y: number;
  w: number;
  h: number;
  size: number;
  weight: number;
  // 글자 크기에 대한 비율(em)
  tracking: number;
  color: string;
  hoverColor?: string;
  align: "left" | "right" | "center";
  action?: ActionId;
  pill?: boolean;
  underlineOnHover?: boolean;
  gradient?: boolean;
};

export type PageLayout = {
  W: number;
  H: number;
  S: number;
  portrait: boolean;
  bw: number;
  bh: number;
  blockLeft: number;
  blockTop: number;
  gap: number;
  nav: Rect;
  panel: Rect;
  mark: Rect;
  items: TextItem[];
};

export type Measure = (font: string, text: string) => number;

const PILL_IDLE = "#e9e9ed";
const PILL_HOVER = "#36d67e";
const LAVENDER = "#b9abff";

export function fontOf(item: Pick<TextItem, "size" | "weight">, family: string) {
  return `${item.weight} ${item.size}px ${family}`;
}

function wrap(
  text: string,
  maxWidth: number,
  font: string,
  measure: Measure,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line === "" ? word : `${line} ${word}`;
    if (line !== "" && measure(font, next) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

export function computeLayout(
  W: number,
  H: number,
  family: string,
  measure: Measure,
  needsApiKey: boolean,
): PageLayout {
  const narrow = W < 640;
  const marginX = narrow ? 16 : W * 0.055;
  const marginY = narrow ? 16 : H * 0.085;
  const bw = W - marginX * 2;
  const bh = H - marginY * 2;
  const S = bw / 1730;
  const gap = Math.max(14 * S, 8);
  const navH = bh * 0.108;
  const nav: Rect = { x: 0, y: 0, w: bw, h: navH };
  const panel: Rect = {
    x: 0,
    y: navH + gap,
    w: bw,
    h: bh - navH - gap,
  };
  const items: TextItem[] = [];

  // 위쪽 메뉴 조각
  const pad = Math.max(28 * S, 16);
  const markSize = Math.max(22 * S, 18);
  const mark: Rect = {
    x: pad,
    y: (navH - markSize) / 2,
    w: markSize,
    h: markSize,
  };
  const brandSize = Math.max(17 * S, 15);
  const brandW = measure(`600 ${brandSize}px ${family}`, "장애 대응 도우미") + 2;
  items.push({
    id: "brand",
    text: "장애 대응 도우미",
    x: pad + markSize + 10,
    y: (navH - brandSize * 1.5) / 2,
    w: brandW,
    h: brandSize * 1.5,
    size: brandSize,
    weight: 600,
    tracking: -0.01,
    color: "rgba(255,255,255,.92)",
    align: "left",
  });

  const linkSize = Math.max(15 * S, 14);
  const linkFont = `400 ${linkSize}px ${family}`;
  const actionW = measure(linkFont, "설정") + 2;
  items.push({
    id: "settings",
    text: "설정",
    x: bw - pad - actionW,
    y: (navH - linkSize * 1.6) / 2,
    w: actionW,
    h: linkSize * 1.6,
    size: linkSize,
    weight: 400,
    tracking: 0,
    color: "rgba(255,255,255,.6)",
    hoverColor: "rgba(255,255,255,.95)",
    align: "right",
    action: "settings",
  });
  if (!narrow) {
    let linkX = bw * 0.34;
    for (const [id, text, action] of [
      ["history", "대화 기록", "history"],
      ["guideNav", "사용 방법", "guide"],
    ] as const) {
      const w = measure(linkFont, text) + 2;
      items.push({
        id,
        text,
        x: linkX,
        y: (navH - linkSize * 1.6) / 2,
        w,
        h: linkSize * 1.6,
        size: linkSize,
        weight: 400,
        tracking: 0,
        color: "rgba(255,255,255,.6)",
        hoverColor: "rgba(255,255,255,.95)",
        align: "left",
        action,
      });
      linkX += w + Math.max(34 * S, 22);
    }
  }

  // 아래쪽 큰 조각 위에 찍히는 내용
  const padL = Math.max(bw * 0.055, 20);
  const oy = panel.y;
  const ph = panel.h;
  const eyebrowSize = Math.max(11 * S, 12);
  items.push({
    id: "eyebrow",
    text: "SERVER INCIDENT HELPER",
    x: padL,
    y: oy + ph * 0.135 - (eyebrowSize * 1.6) / 2,
    w: measure(`400 ${eyebrowSize}px ${family}`, "SERVER INCIDENT HELPER") + eyebrowSize * 0.2 * 22,
    h: eyebrowSize * 1.6,
    size: eyebrowSize,
    weight: 400,
    tracking: 0.2,
    color: "rgba(255,255,255,.38)",
    align: "left",
  });

  // 좁은 화면에서는 7.8%가 너무 작아 읽기 어려우므로 키운다.
  const headSize = Math.min(bw * (narrow ? 0.14 : 0.078), ph * 0.2);
  const headLine = headSize * 0.97;
  const headTop = oy + ph * 0.21;
  const headFont = `500 ${headSize}px ${family}`;
  ["어떤 장애가", "발생했나요?"].forEach((text, index) => {
    items.push({
      id: `headline${index}`,
      text,
      x: padL,
      y: headTop + headLine * index,
      w: measure(headFont, text) + 4,
      h: headLine,
      size: headSize,
      weight: 500,
      tracking: -0.045,
      color: "#dcdce0",
      align: "left",
      gradient: true,
    });
  });
  const headBottom = headTop + headLine * 2;

  const subSize = Math.max(18 * S, 15);
  const subLine = subSize * 1.6;
  const subFont = `400 ${subSize}px ${family}`;
  const subMax = narrow ? bw - padL * 2 : Math.min(bw * 0.46, 640);
  const subLines = wrap(
    "증상이나 에러 메시지를 알려 주시면 운영 매뉴얼에서 조치 방법과 출처를 찾아 드립니다. 매뉴얼에 없으면 인터넷에서 찾습니다.",
    subMax,
    subFont,
    measure,
  );
  const subTop = headBottom + ph * 0.035;
  subLines.forEach((text, index) => {
    items.push({
      id: `sub${index}`,
      text,
      x: padL,
      y: subTop + subLine * index,
      w: measure(subFont, text) + 4,
      h: subLine,
      size: subSize,
      weight: 400,
      tracking: 0,
      color: "rgba(255,255,255,.55)",
      align: "left",
    });
  });
  const subBottom = subTop + subLine * subLines.length;

  const pillLabel = needsApiKey ? "API 키 설정" : "질문 시작하기";
  const pillSize = Math.max(15 * S, 14);
  const pillW = Math.max(
    116 * S,
    measure(`500 ${pillSize}px ${family}`, pillLabel) + 40,
    132,
  );
  const pillH = Math.max(40 * S, 44);
  const pillY = subBottom + ph * 0.05;
  items.push({
    id: "pill",
    text: pillLabel,
    x: padL,
    y: pillY,
    w: pillW,
    h: pillH,
    size: pillSize,
    weight: 500,
    tracking: 0,
    color: "#0b0b0d",
    align: "center",
    action: "start",
    pill: true,
  });

  const linkLabel = "사용 방법 →";
  items.push({
    id: "guide",
    text: linkLabel,
    x: padL + pillW + Math.max(28 * S, 20),
    y: pillY + (pillH - linkSize * 1.6) / 2,
    w: measure(linkFont, linkLabel) + 2,
    h: linkSize * 1.6,
    size: linkSize,
    weight: 400,
    tracking: 0,
    color: "rgba(255,255,255,.7)",
    hoverColor: "rgba(255,255,255,1)",
    align: "left",
    action: "guide",
    underlineOnHover: true,
  });

  const footSize = Math.max(11 * S, 12);
  const footFont = `400 ${footSize}px ${family}`;
  const footY = oy + ph - Math.max(24 * S, 16) - footSize * 1.5;
  items.push({
    id: "footLeft",
    text: "서버에 접속하거나 명령을 실행하지 않습니다",
    x: padL,
    y: footY,
    w: measure(footFont, "서버에 접속하거나 명령을 실행하지 않습니다") + 2,
    h: footSize * 1.5,
    size: footSize,
    weight: 400,
    tracking: 0,
    color: "rgba(255,255,255,.34)",
    align: "left",
  });
  if (!narrow) {
    const text = "대화는 이 브라우저에만 저장됩니다";
    const w = measure(footFont, text) + 2;
    items.push({
      id: "footRight",
      text,
      x: bw - padL - w,
      y: footY,
      w,
      h: footSize * 1.5,
      size: footSize,
      weight: 400,
      tracking: 0,
      color: "rgba(255,255,255,.34)",
      align: "right",
    });
  }

  return {
    W,
    H,
    S,
    portrait: W < H,
    bw,
    bh,
    blockLeft: marginX,
    blockTop: marginY,
    gap,
    nav,
    panel,
    mark,
    items,
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 페이지 전체를 한 장의 캔버스에 그린다. 조각마다 이 그림의 자기 자리를 잘라 쓴다.
export function drawPage(
  ctx: CanvasRenderingContext2D,
  layout: PageLayout,
  family: string,
  hover: string | null,
) {
  ctx.clearRect(0, 0, layout.bw, layout.bh);
  ctx.textBaseline = "middle";

  const { mark } = layout;
  ctx.fillStyle = "rgba(255,255,255,.92)";
  roundRect(ctx, mark.x, mark.y, mark.w, mark.h, 4);
  ctx.fill();
  ctx.fillStyle = "#0b0b0d";
  ctx.beginPath();
  ctx.moveTo(mark.x + mark.w * 0.28, mark.y + mark.h * 0.72);
  ctx.lineTo(mark.x + mark.w * 0.72, mark.y + mark.h * 0.28);
  ctx.lineTo(mark.x + mark.w * 0.72, mark.y + mark.h * 0.72);
  ctx.closePath();
  ctx.fill();

  const headlines = layout.items.filter((item) => item.gradient);
  const headTop = headlines[0]?.y ?? 0;
  const headBottom = headlines.length
    ? headlines[headlines.length - 1].y + headlines[headlines.length - 1].h
    : 0;

  for (const item of layout.items) {
    const hovered = hover === item.id;
    const centerY = item.y + item.h / 2;
    ctx.font = fontOf(item, family);
    ctx.letterSpacing = `${item.tracking * item.size}px`;

    if (item.pill) {
      ctx.fillStyle = hovered ? PILL_HOVER : PILL_IDLE;
      roundRect(ctx, item.x, item.y, item.w, item.h, 6);
      ctx.fill();
      ctx.fillStyle = item.color;
      ctx.textAlign = "center";
      ctx.fillText(item.text, item.x + item.w / 2, centerY);
      continue;
    }

    if (item.gradient) {
      const gradient = ctx.createLinearGradient(0, headTop, 0, headBottom);
      gradient.addColorStop(0, "#dcdce0");
      gradient.addColorStop(1, "#bdbdc3");
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = hovered && item.hoverColor ? item.hoverColor : item.color;
    }

    let anchorX = item.x;
    ctx.textAlign = "left";
    if (item.align === "right") {
      ctx.textAlign = "right";
      anchorX = item.x + item.w;
    } else if (item.align === "center") {
      ctx.textAlign = "center";
      anchorX = item.x + item.w / 2;
    }
    ctx.fillText(item.text, anchorX, centerY);

    if (hovered && item.underlineOnHover) {
      ctx.fillRect(item.x, centerY + item.size * 0.62, item.w - 2, 1);
    }
  }
  ctx.letterSpacing = "0px";
}

// 되돌아가기 조각의 크기와 자리. 가로 화면 기준 비율에서 출발해 좁은 화면에서는 키운다.
export function sliverGeometry(W: number, H: number) {
  const w = Math.max(W * 0.14, 150);
  const h = w * 0.434;
  const left = Math.max(W * 0.147, 16);
  const top = Math.max(H * 0.169, 56);
  const unit: [number, number][] = [
    [0, 0.685],
    [0.75, 0],
    [1, 1],
    [0.029, 0.824],
  ];
  return {
    left,
    top,
    w,
    h,
    points: unit.map(([u, v]) => ({ x: left + u * w, y: top + v * h })),
    labelX: left + w * 0.514,
    labelY: top + h * 0.64,
    k: W / 1918,
  };
}

export const COLORS = { pillHover: PILL_HOVER, lavender: LAVENDER };
