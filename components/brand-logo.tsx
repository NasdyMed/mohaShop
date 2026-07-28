import Image from "next/image";

export function BrandLogo() {
  return (
    <Image
      className="brand-logo"
      src="/brand/maelo-logo.png"
      alt="Maelo"
      width={127}
      height={79}
      priority
    />
  );
}
