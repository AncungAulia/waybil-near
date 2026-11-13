import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from "sonner";
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
      <body className="font-sans">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
        {/*
          One toaster for the whole app. Bottom right on a computer. On a phone it sits above
          the bottom navigation. Each toast draws its own card (lib/notify.tsx).
        */}
        <Toaster
          position="bottom-right"
          visibleToasts={3}
          gap={10}
          offset={24}
          mobileOffset={{ bottom: 100, left: 16, right: 16 }}
          toastOptions={{ unstyled: true }}
        />
      </body>
    </html>
  );
}
