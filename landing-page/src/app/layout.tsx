import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import { SmoothScroll } from "@/components/SmoothScroll";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Waybil · Truck owners get paid on arrival",
  description:
    "Waybil pays truck owners the moment the warehouse confirms the delivery. The shipper pays later, on the date they chose.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${instrumentSans.variable} antialiased`}>
      <body className="font-sans">
        {/* Without JavaScript the scroll reveals never run, so show everything at once. */}
        <noscript>
          <style>{`.reveal,.rise-in{opacity:1;transform:none}.media-in{clip-path:none}.media-in img{transform:none}`}</style>
        </noscript>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
