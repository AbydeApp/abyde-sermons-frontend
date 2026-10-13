import { FORMATS } from "@/constants/brand";
import type { BrandProfile, TemplateVariant, VisualFormat, WatermarkPosition } from "@/types";
import { cn } from "@/utils/cn";

export type PreviewBrand = Pick<
  BrandProfile,
  "churchName" | "primaryColor" | "secondaryColor" | "accentColor" | "headingFont" | "bodyFont" | "socialHandle" | "watermarkEnabled" | "watermarkPosition" | "footerText"
> & { logoUrl?: string | null; alternateLogoUrl?: string | null };

const DARK_VARIANTS: TemplateVariant[] = ["bold", "gradient", "photo", "split", "outline"];

const WATERMARK_POS: Record<WatermarkPosition, React.CSSProperties> = {
  "top-left": { top: "4cqw", left: "4cqw" },
  "top-right": { top: "4cqw", right: "4cqw" },
  "bottom-left": { bottom: "4cqw", left: "4cqw" },
  "bottom-right": { bottom: "4cqw", right: "4cqw" },
  center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
};

/** Font size (in container-width units) that keeps long copy inside the frame. */
export function headlineSize(length: number, format: VisualFormat) {
  const wide = format === "facebook" || format === "youtube-thumbnail";
  const base = wide ? 5.6 : 7.4;
  if (length > 220) return base * 0.62;
  if (length > 140) return base * 0.74;
  if (length > 80) return base * 0.88;
  return base;
}

/**
 * Client-side rendering of a branded graphic. Everything is sized in container-width
 * units (cqw), so it scales to any preview size and updates instantly as the brand changes.
 */
export function BrandPreview({
  brand,
  variant,
  format,
  headline,
  body,
  label,
  backgroundUrl,
  slideLabel,
  className,
}: {
  brand: PreviewBrand;
  variant: TemplateVariant;
  format: VisualFormat;
  headline: string;
  body?: string;
  label?: string;
  backgroundUrl?: string | null;
  slideLabel?: string;
  className?: string;
}) {
  const { width, height } = FORMATS[format];
  const dark = DARK_VARIANTS.includes(variant);
  const fg = dark ? "#ffffff" : "#1B1A17";
  const logo = (dark ? (brand.alternateLogoUrl ?? brand.logoUrl) : brand.logoUrl) ?? null;
  const wide = format === "facebook" || format === "youtube-thumbnail";

  const background: React.CSSProperties =
    variant === "bold"
      ? { background: brand.primaryColor }
      : variant === "minimal"
        ? { background: "#FAF9F6" }
        : variant === "gradient"
          ? { background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }
          : variant === "photo"
            ? backgroundUrl
              ? { background: `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.65)), url("${backgroundUrl}") center/cover` }
              : { background: `linear-gradient(160deg, ${brand.secondaryColor}, #000)` }
            : { background: brand.secondaryColor };

  return (
    <div
      role="img"
      aria-label={`${label ?? "Brand"} preview: ${headline}`}
      className={cn("relative w-full overflow-hidden rounded-md shadow-sm", className)}
      style={{ aspectRatio: `${width} / ${height}`, containerType: "inline-size", color: fg, ...background }}
    >
      {variant === "split" && <div aria-hidden className="absolute inset-y-0 left-0" style={{ width: "3cqw", background: brand.accentColor }} />}
      {variant === "outline" && (
        <div aria-hidden className="absolute" style={{ inset: "4cqw", border: `0.7cqw solid ${brand.accentColor}` }} />
      )}

      {/* Header: logo or church name */}
      <div className="absolute flex items-center" style={{ top: "5cqw", left: variant === "split" ? "8cqw" : "7cqw", gap: "2cqw" }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-provided brand asset
          <img src={logo} alt="" style={{ height: wide ? "7cqw" : "6cqw", width: "auto", maxWidth: "24cqw", objectFit: "contain" }} />
        ) : (
          <span style={{ fontFamily: `'${brand.headingFont}', serif`, fontSize: "3cqw", fontWeight: 700, opacity: 0.9 }}>{brand.churchName}</span>
        )}
      </div>

      {/* Copy */}
      <div
        className="absolute flex flex-col justify-center"
        style={{ left: variant === "split" ? "8cqw" : "7cqw", right: "7cqw", top: wide ? "16cqw" : "20cqw", bottom: wide ? "10cqw" : "16cqw" }}
      >
        <span aria-hidden style={{ display: "block", width: "10cqw", height: "0.9cqw", background: brand.accentColor, marginBottom: "3cqw" }} />
        {label && (
          <span style={{ fontFamily: `'${brand.bodyFont}', sans-serif`, fontSize: "2.4cqw", letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.75, marginBottom: "2cqw", color: variant === "minimal" ? brand.primaryColor : undefined }}>
            {label}
          </span>
        )}
        <p style={{ fontFamily: `'${brand.headingFont}', serif`, fontWeight: 700, lineHeight: 1.15, fontSize: `${headlineSize(headline.length, format)}cqw`, margin: 0, textWrap: "balance" } as React.CSSProperties}>
          {headline}
        </p>
        {body && (
          <p style={{ fontFamily: `'${brand.bodyFont}', sans-serif`, fontSize: wide ? "2.6cqw" : "3.3cqw", lineHeight: 1.45, marginTop: "3cqw", opacity: 0.88 }}>{body}</p>
        )}
      </div>

      {/* Footer */}
      {(brand.footerText || brand.socialHandle) && (
        <span className="absolute" style={{ left: variant === "split" ? "8cqw" : "7cqw", bottom: "5cqw", fontFamily: `'${brand.bodyFont}', sans-serif`, fontSize: "2.4cqw", opacity: 0.8 }}>
          {brand.footerText || brand.socialHandle}
        </span>
      )}
      {slideLabel && (
        <span className="absolute" style={{ right: "7cqw", top: "5cqw", fontFamily: `'${brand.bodyFont}', sans-serif`, fontSize: "2.4cqw", opacity: 0.8 }}>
          {slideLabel}
        </span>
      )}

      {/* Watermark */}
      {brand.watermarkEnabled && (
        <div className="absolute" style={{ ...WATERMARK_POS[brand.watermarkPosition], opacity: 0.55 }} aria-hidden>
          {brand.alternateLogoUrl || brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-provided brand asset
            <img src={(brand.alternateLogoUrl ?? brand.logoUrl)!} alt="" style={{ height: "5cqw", width: "auto" }} />
          ) : (
            <span style={{ fontFamily: `'${brand.bodyFont}', sans-serif`, fontSize: "2.2cqw", fontWeight: 600 }}>{brand.churchName}</span>
          )}
        </div>
      )}
    </div>
  );
}
