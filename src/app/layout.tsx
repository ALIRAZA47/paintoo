import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "paintoo — a studio for marks",
  description: "A small studio for marks.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          // Restore theme before paint to avoid flash.
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('paintoo-theme') || 'dark';
                document.documentElement.setAttribute('data-theme', t);
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="overflow-hidden">{children}</body>
    </html>
  );
}
