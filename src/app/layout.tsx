import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit, Space_Grotesk } from "next/font/google";
import "./globals.css";

const headline = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap",
});

const body = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

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
      <body className={`${headline.variable} ${body.variable} ${display.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
