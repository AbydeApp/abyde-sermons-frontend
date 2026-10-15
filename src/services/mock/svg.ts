import type { BrandAssetKind, TemplateVariant } from "@/types";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines).map((l, i, a) => (i === a.length - 1 && lines.length > maxLines ? `${l}…` : l));
}

/** Builds a downloadable SVG poster. Mock-only stand-in for server-rendered media. */
export function buildPoster(opts: {
  width: number;
  height: number;
  variant: TemplateVariant;
  primary: string;
  secondary: string;
  accent: string;
  headingFont: string;
  bodyFont: string;
  headline: string;
  body?: string;
  footer?: string;
}): string {
  const { width: w, height: h, variant, primary, secondary, accent, headingFont, bodyFont } = opts;
  const light = variant === "minimal";
  const bg = light ? "#FFFFFF" : variant === "gradient" ? "url(#g)" : variant === "split" ? secondary : primary;
  const fg = light ? "#1C1626" : "#FFFFFF";
  const size = Math.round(w * 0.075);
  const lines = wrap(opts.headline, Math.max(12, Math.round(24 * (1080 / w) * (w / 1080))), 6);
  const text = lines
    .map((l, i) => `<text x="${w * 0.1}" y="${h * 0.34 + i * size * 1.25}" font-family="${esc(headingFont)}, serif" font-size="${size}" font-weight="700" fill="${fg}">${esc(l)}</text>`)
    .join("");
  const body = opts.body
    ? wrap(opts.body, 40, 3)
        .map((l, i) => `<text x="${w * 0.1}" y="${h * 0.34 + lines.length * size * 1.25 + size + i * size * 0.7}" font-family="${esc(bodyFont)}, sans-serif" font-size="${Math.round(size * 0.5)}" fill="${fg}" opacity="0.85">${esc(l)}</text>`)
        .join("")
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${primary}"/><stop offset="1" stop-color="${secondary}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="${bg}"/>${
    variant === "split" ? `<rect width="${w * 0.04}" height="${h}" fill="${accent}"/>` : ""
  }${variant === "outline" ? `<rect x="${w * 0.05}" y="${h * 0.05}" width="${w * 0.9}" height="${h * 0.9}" fill="none" stroke="${accent}" stroke-width="6"/>` : ""}<rect x="${w * 0.1}" y="${h * 0.26}" width="${w * 0.12}" height="8" fill="${accent}"/>${text}${body}${
    opts.footer ? `<text x="${w * 0.1}" y="${h * 0.93}" font-family="${esc(bodyFont)}, sans-serif" font-size="${Math.round(size * 0.4)}" fill="${fg}" opacity="0.7">${esc(opts.footer)}</text>` : ""
  }</svg>`;
}

export const toDataUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const KIND_COLORS: Record<BrandAssetKind, [string, string]> = {
  LOGO: ["#7A21B0", "#F3E9FA"],
  PORTRAIT: ["#3B4A5A", "#C9D3DD"],
  VENUE: ["#5A4A3B", "#E6D8C8"],
  TEXTURE: ["#2F3A2F", "#A7B8A0"],
  STOCK: ["#2F4A5A", "#A0C0D0"],
  WATERMARK: ["#1C1626", "#D8D3E3"],
};

/** Placeholder artwork for uploaded brand assets in mock mode. */
export function placeholderAsset(kind: BrandAssetKind, label: string): string {
  const [a, b] = KIND_COLORS[kind];
  return toDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><text x="200" y="215" text-anchor="middle" font-family="Inter, sans-serif" font-size="28" fill="#fff">${esc(label.slice(0, 18))}</text></svg>`,
  );
}
