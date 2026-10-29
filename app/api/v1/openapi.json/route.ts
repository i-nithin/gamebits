import { documentedOrigin } from "@/lib/api/origin";
import { openApiDocument } from "@/lib/api/openapi";

export function GET() {
  return Response.json(openApiDocument(documentedOrigin()), {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
