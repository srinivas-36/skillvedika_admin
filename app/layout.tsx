import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const poppinsMono = Poppins({
  variable: "--font-poppins-mono",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SkillVedika Admin",
  description: "Manage courses, users, and content",
  icons: {
    icon: "/favicon.ico",
  },
  metadataBase: new URL("https://skillvedika.com"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`admin-app ${poppins.variable} ${poppinsMono.variable} ${poppins.className}`}
    >
      <body className="admin-body min-h-screen">
        {children}
      </body>
    </html>
  );
}