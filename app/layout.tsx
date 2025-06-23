// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title:       "Char’s Choice",
  description: "Local gunpla prices",
  icons: {
   icon:     "/favicon.png",    // make sure you've put favicon.png in public/
   shortcut: "/favicon.png",
   apple:    "/favicon.png",
 },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* ← this tells Next.js "please inject the <meta> and <link> tags from `metadata` here" */}
      <head>

      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
