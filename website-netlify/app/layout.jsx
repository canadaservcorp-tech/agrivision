import "./globals.css";

export const metadata = {
  title: "AgriVision — AI-Powered Agricultural Monitoring",
  description: "Transform your farm with AI disease detection. $31/camera, 87% cost savings. Protect crops 24/7.",
  metadataBase: new URL("https://theagrivision.com"),
  openGraph: { title: "AgriVision", description: "AI cameras that detect crop diseases before they spread.", type: "website" },
  icons: { icon: "/favicon.ico", apple: "/icon-192.png" },
  manifest: "/manifest.json",
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#1e3a2f" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
