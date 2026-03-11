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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://pantheon.app"),
  title: {
    default: "Pantheon — Your AI Team",
    template: "%s | Pantheon",
  },
  description:
    "A managed AI agent team for any business. Tasks, email, SOPs, research, and communication tracking — all through your Discord server.",
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
