import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { HydrateCharacters } from "@/components/hydrate";
import { AccountSync } from "@/components/account-sync";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/brand";
import appCss from "../styles.css?url";

// A bare asset URL can be stuck on a cached "not found". The query is a
// different address, so the browser fetches the file that is actually there.
const stylesheet = appCss.includes("?") ? `${appCss}&v=2` : `${appCss}?v=2`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "description", content: APP_DESCRIPTION },
      { name: "theme-color", content: "#2B2218" },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico?v=op20" },
      { rel: "icon", type: "image/png", sizes: "64x64", href: "/favicon.png?v=op20" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/favicon-192.png?v=op20" },
      { rel: "stylesheet", href: stylesheet },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-parchment text-ink">
        <PreviewHostBridge />
        <AuthProvider>
          <HydrateCharacters />
          <AccountSync />
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
