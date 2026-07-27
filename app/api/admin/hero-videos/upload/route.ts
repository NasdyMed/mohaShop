import { randomUUID } from "node:crypto";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdmin } from "@/lib/auth/require-admin";

const extensions: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export async function POST(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as HandleUploadBody;
  if (body.type === "blob.generate-client-token") {
    const requestedType = body.payload.clientPayload;
    const inferredType = body.payload.pathname.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4";
    const extension = extensions[requestedType ?? inferredType] ?? extensions[inferredType];
    body.payload.pathname = `hero/${randomUUID()}.${extension}`;
  }
  const result = await handleUpload({
    request,
    body,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: ["video/mp4", "video/webm"],
      maximumSizeInBytes: 50 * 1024 * 1024,
      addRandomSuffix: true,
    }),
  });
  return Response.json(result);
}
