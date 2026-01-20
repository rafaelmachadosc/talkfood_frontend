import Image from "next/image";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className = "", width = 120, height = 40 }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="TalkFood"
      width={width}
      height={height}
      className={className}
      priority
      style={{ objectFit: "contain" }}
      unoptimized
    />
  );
}
