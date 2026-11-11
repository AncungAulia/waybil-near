"use client";
import { useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@waybil/shared";
import { ApiError } from "@/lib/api";
import { getShipper } from "@/lib/near";
import { connectWallet, disconnectWallet, walletSignIn } from "@/lib/wallet";
import { useAuth } from "@/providers/AuthProvider";
import type { OnboardingState } from "../data/fixtures";
import { HOME } from "../data/steps";

export type SignInFlow = "wallet" | "google" | "invite";

/** A shipper the team started on chain. A failed read counts as active, so nobody is sent back by mistake. */
async function activeShipper(accountId: string) {
  try {
    return !!(await getShipper(accountId));
  } catch {
    return true;
  }
}

/*
 * Live wallet sign-in (#82). A new account has no role yet, so the server answers
 * E_ROLE_REQUIRED, B1 asks for one, and the wallet signs a second challenge with it.
 */
export function useWalletSignIn({
  setState,
  setRole,
  setGoogle,
  setSignInError,
  attempt,
  lastFlow,
}: {
  setState: Dispatch<SetStateAction<OnboardingState>>;
  setRole: Dispatch<SetStateAction<Role | null>>;
  setGoogle: Dispatch<SetStateAction<boolean>>;
  setSignInError: Dispatch<SetStateAction<string | null>>;
  /** Cancel on A2 abandons the attempt that is still waiting on the wallet. */
  attempt: MutableRefObject<number>;
  lastFlow: MutableRefObject<SignInFlow>;
}) {
  const router = useRouter();
  const { signIn } = useAuth();
  const dashboard = (path: string) => router.push(path);
  /* The wallet role picked on A1, used only if the account turns out to be new. */
  const chosen = useRef<"shipper" | "investor" | null>(null);
  const pending = useRef<Awaited<ReturnType<typeof connectWallet>> | null>(null);
  async function walletFlow(role?: "shipper" | "investor") {
    lastFlow.current = "wallet";
    const id = ++attempt.current;
    setSignInError(null);
    setState("A2");
    try {
      pending.current ??= await connectWallet();
      const { wallet, accountId } = pending.current;
      const session = await walletSignIn(wallet, accountId, role);
      if (id !== attempt.current) return;
      signIn(session);
      pending.current = null;
      if (role) setState(role === "shipper" ? "C1" : "E1");
      else if (session.profile.role === "shipper" && !(await activeShipper(accountId)))
        /* A shipper who signed up but hasn't finished applying goes back to the application. */
        router.push("/onboarding/shipper");
      else dashboard(HOME[session.profile.role] ?? "/start");
    } catch (error) {
      if (id !== attempt.current) return;
      if (error instanceof ApiError && error.code === "E_ROLE_REQUIRED") {
        /* A new account. The role picked on A1 signs the second challenge, so B1 is skipped. */
        if (!role && chosen.current) return void walletFlow(chosen.current);
        setRole(null);
        setGoogle(false);
        setState("B1");
        return;
      }
      setSignInError(
        !(error instanceof ApiError)
          ? null
          : error.status === 403
            ? "This account signs in with Google. Go back and continue with Google instead."
            : error.status === 401
              ? "Your sign-in request expired. Try again to get a new one."
              : error.message,
      );
      setState("A3");
    }
  }
  async function switchWallet() {
    attempt.current++;
    pending.current = null;
    await disconnectWallet();
    setState("A1");
  }
  return { chosen, pending, walletFlow, switchWallet };
}
export type WalletSignIn = ReturnType<typeof useWalletSignIn>;
