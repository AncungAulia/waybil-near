import { GOOGLE_CLIENT_ID } from "./env";

/*
 * Google Identity Services for drivers and warehouses. The ID token carries the sign-in
 * challenge's nonce, which the backend checks.
 */

interface PromptMoment {
  isNotDisplayed(): boolean;
  isSkippedMoment(): boolean;
}
interface GoogleId {
  initialize(options: {
    client_id: string;
    nonce: string;
    callback: (response: { credential?: string }) => void;
    cancel_on_tap_outside?: boolean;
  }): void;
  prompt(listener?: (moment: PromptMoment) => void): void;
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
  cancel(): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let loading: Promise<GoogleId> | null = null;
function load() {
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    if (window.google) return resolve(window.google.accounts.id);
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () =>
      window.google ? resolve(window.google.accounts.id) : reject(new Error("No Google"));
    script.onerror = () => {
      loading = null;
      reject(new Error("Google sign-in could not load"));
    };
    document.head.append(script);
  });
  return loading;
}

/**
 * Asks Google for an ID token with this nonce. Google shows its own account picker. When it
 * can't (blocked or dismissed before), the official Google button is drawn in `fallback`.
 */
export async function googleIdToken(nonce: string, fallback: () => HTMLElement | null) {
  if (!GOOGLE_CLIENT_ID) throw new Error("Google sign-in is not set up");
  const id = await load();
  return new Promise<string>((resolve, reject) => {
    id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      nonce,
      cancel_on_tap_outside: false,
      callback: ({ credential }) =>
        credential ? resolve(credential) : reject(new Error("Google gave no token")),
    });
    id.prompt((moment) => {
      if (!moment.isNotDisplayed() && !moment.isSkippedMoment()) return;
      const slot = fallback();
      if (!slot) return reject(new Error("Google sign-in was closed"));
      slot.replaceChildren();
      id.renderButton(slot, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 280,
      });
    });
  });
}
