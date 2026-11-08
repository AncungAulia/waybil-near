import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Waybil",
  description: "Get paid the moment the warehouse confirms the delivery.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${instrumentSerif.variable} ${geistMono.variable} antialiased`}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
