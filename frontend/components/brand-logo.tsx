import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: "dark-surface" | "light-surface";
  size?: "sm" | "md" | "lg" | "header" | "hero";
  className?: string;
};

const widthMap = {
  sm: "w-[155px]",
  md: "w-[200px]",
  header: "w-[180px] sm:w-[230px] lg:w-[255px]",
  lg: "w-[240px]",
  hero: "w-[260px] sm:w-[300px]",
};

/**
 * Renders the official CasePilot AI logo PNG at its native 9:5 aspect ratio.
 * Negative vertical margins trim only the source PNG's transparent padding
 * without distorting, scaling unevenly, or clipping the AI badge.
 */
export function BrandLogo({
  variant = "light-surface",
  size = "header",
  className,
}: BrandLogoProps) {
  const src =
    variant === "dark-surface"
      ? "/assets/casepilot-logo-dark.png"
      : "/assets/casepilot-logo-light.png";

  return (
    <span className={cn("brand-logo-box", widthMap[size], className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="CasePilot AI"
        width={2700}
        height={1500}
        className="brand-logo-img"
      />
    </span>
  );
}
