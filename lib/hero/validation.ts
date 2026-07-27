import { z } from "zod";

const VERCEL_BLOB_HOSTNAME =
  /^[^.]+\.public\.blob\.vercel-storage\.com$/;

export function isHeroVideoBlobUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      url.port === "" &&
      VERCEL_BLOB_HOSTNAME.test(url.hostname) &&
      url.pathname.startsWith("/hero/")
    );
  } catch {
    return false;
  }
}

const heroVideoUrlSchema = z
  .url()
  .refine((value) => {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      url.port === "" &&
      VERCEL_BLOB_HOSTNAME.test(url.hostname)
    );
  });

export const heroVideoInputSchema = z.object({
  id: z.cuid().optional(),
  url: heroVideoUrlSchema,
  title: z.string().trim().min(2).max(120),
  position: z.number().int().min(0),
  isVisible: z.boolean(),
});

export function hasVideoSignature(
  type: string,
  bytes: Uint8Array,
): boolean {
  if (type === "video/mp4") {
    return (
      bytes.length >= 8 &&
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70
    );
  }

  if (type === "video/webm") {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x1a &&
      bytes[1] === 0x45 &&
      bytes[2] === 0xdf &&
      bytes[3] === 0xa3
    );
  }

  return false;
}
