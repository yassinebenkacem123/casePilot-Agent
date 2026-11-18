import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: "dark-surface" | "light-surface";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: "h-7 w-auto",
  md: "h-8 w-auto",
  lg: "h-10 w-auto",
};

/**
 * Renders the official CasePilot AI logo asset without altering proportions.
 * Use "dark-surface" (white wordmark + #FF3419 AI badge) on dark backgrounds.
 */
export function BrandLogo({
  variant = "dark-surface",
  size = "md",
  className,
}: BrandLogoProps) {
  const src =
    variant === "dark-surface"
      ? "/assets/casepilot-logo-dark.png"
      : "/assets/casepilot-logo-light.png";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="CasePilot AI"
      width={180}
      height={100}
      className={cn("block select-none object-contain", sizeMap[size], className)}
    />
  );
}

