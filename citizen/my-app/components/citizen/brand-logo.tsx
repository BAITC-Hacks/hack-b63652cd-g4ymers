import Image from "next/image";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <Image src={compact ? "/brand/mark.svg" : "/brand/logo.svg"} alt="E-AkimAI" width={compact ? 600 : 2250} height={880} unoptimized priority className={compact ? "citizen-logo citizen-logo-mark" : "citizen-logo citizen-logo-full"} />;
}
