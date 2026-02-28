/**
 * GET /api/manifest — PWA Web App Manifest
 */
export async function GET() {
  const manifest = {
    name: "AgriVision",
    short_name: "AgriVision",
    description: "AI-Powered Agricultural Monitoring",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f8faf5",
    theme_color: "#1e3a2f",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    categories: ["agriculture", "business", "productivity"],
  };

  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
