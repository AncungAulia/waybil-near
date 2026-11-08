import { Navbar } from "@/components/Navbar";
import { ScrollIndicator } from "@/components/ScrollIndicator";
import { APP_URL } from "@/lib/env";
import { Cta } from "@/sections/Cta";
import { Faq } from "@/sections/Faq";
import { Footer } from "@/sections/Footer";
import { FourPeople } from "@/sections/FourPeople";
import { Hero } from "@/sections/Hero";
import { HowItWorks } from "@/sections/HowItWorks";
import { Statement } from "@/sections/Statement";

export default function Home() {
  return (
    <>
      <Navbar appUrl={APP_URL} />
      <main>
        <Hero appUrl={APP_URL} />
        <Statement />
        <HowItWorks />
        <FourPeople />
        <Faq />
        <Cta appUrl={APP_URL} />
      </main>
      <Footer />
      <ScrollIndicator />
    </>
  );
}
