import { createFileRoute } from "@tanstack/react-router";
import { prepareAuthRequest } from "@/lib/auth/request-origin";
import { auth } from "@/lib/auth/server";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(prepareAuthRequest(request)),
      POST: ({ request }) => auth.handler(prepareAuthRequest(request)),
    },
  },
});