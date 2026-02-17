import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";

const bodyStyle = {
  "--font-headline": "\"Segoe UI\", \"Helvetica Neue\", Arial, sans-serif",
  "--font-sans": "\"Segoe UI\", \"Helvetica Neue\", Arial, sans-serif",
} as CSSProperties;

export const metadata: Metadata = {
  title: {
    default: "FarmClaw — AI That Works Your Farm",
    template: "%s | FarmClaw",
  },
  description:
    "A managed AI assistant for Upper Midwest row crop farmers. Get grain bids, weather, and market intelligence through your farm's Discord server.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" style={bodyStyle}>
        {children}
      </body>
    </html>
  );
}
