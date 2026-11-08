import { APP_URL } from "@/lib/env";

// Placeholder until the sections from design/waybil.pen ("8 · Landing page") are built.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-ds-night px-5 text-center text-white">
      <h1 className="max-w-2xl text-5xl font-medium tracking-tight md:text-7xl">
        Deliver today. Get paid today.
      </h1>
      <p className="max-w-md text-lg text-white/70">
        The Waybil landing page is being built. You can already open the app on NEAR testnet.
      </p>
      <a
        href={APP_URL}
        className="rounded-full bg-ds-brand px-6 py-3 font-medium text-ds-ink transition-transform duration-150 ease-out active:scale-[0.97]"
      >
        Open the app
      </a>
    </main>
  );
}
