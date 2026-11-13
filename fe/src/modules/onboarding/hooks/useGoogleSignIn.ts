"use client";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import type { ChallengeResponse, PublicInvite, SessionResponse } from "@waybil/shared";
import { api, ApiError } from "@/lib/api";
import { LIVE } from "@/lib/env";
import { googleIdToken } from "@/lib/google";
import { deviceKey } from "@/lib/relay";
import { useAuth } from "@/providers/AuthProvider";
import type { OnboardingState } from "../data/fixtures";
import { HOME } from "../data/steps";
import type { SignInFlow } from "./useWalletSignIn";

/*
 * Live Google sign-in (#83) for drivers and warehouses. The phone's device key goes with the
 * challenge, Google signs the challenge's nonce into the ID token, and the backend sets up
 * the account. An invite code makes a warehouse, or links a driver to a shipper.
 */
export function useGoogleSignIn({
  preview,
  inviteCode,
  setState,
  setSignInError,
  attempt,
  lastFlow,
}: {
  preview: boolean;
  inviteCode?: string;
  setState: Dispatch<SetStateAction<OnboardingState>>;
  setSignInError: Dispatch<SetStateAction<string | null>>;
  attempt: MutableRefObject<number>;
  lastFlow: MutableRefObject<SignInFlow>;
}) {
  const router = useRouter();
  const client = useQueryClient();
  const { signIn, profile } = useAuth();
  const dashboard = (path: string) => router.push(path);
  const googleSlot = useRef<HTMLDivElement>(null);
  const [googleWaiting, setGoogleWaiting] = useState(false);
  const liveInvite = LIVE && !preview && !!inviteCode;
  /*
   * The invite is read once per code and not again in the background. A later sign-in moves
   * on through acceptInvite, so a fresh read would only show the invite as used.
   */
  const invite = useQuery({
    queryKey: qk.invite(inviteCode ?? ""),
    queryFn: () => api<PublicInvite>(`/invites/${inviteCode}`),
    enabled: liveInvite,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const publicInvite = invite.data ?? null;
  const shipperName = liveInvite ? (publicInvite?.shipperName ?? "the company") : "Northwind";
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!liveInvite || !inviteCode || opened.current === inviteCode) return;
    if (invite.data) {
      opened.current = inviteCode;
      const found = invite.data;
      setState(
        found.state !== "open"
          ? "F4"
          : found.type === "warehouse"
            ? "F5"
            : profile?.role === "driver"
              ? "F2"
              : "F1",
      );
    } else if (invite.error) {
      opened.current = inviteCode;
      /* Only a missing invite is "used or expired". A dropped connection shows the retry screen. */
      const error = invite.error;
      setState(error instanceof ApiError && error.status === 404 ? "F4" : "X2");
    }
  }, [liveInvite, inviteCode, invite.data, invite.error, profile?.role, setState]);
  const accept = useMutation({
    mutationFn: () => api(`/invites/${inviteCode}/accept`, { body: {} }),
    /* Accepting links the person to a shipper, so their profile and data change. */
    onSuccess: () => client.invalidateQueries({ queryKey: qk.me() }),
  });
  async function acceptInvite() {
    await accept.mutateAsync();
    setState(publicInvite?.type === "warehouse" ? "F6" : "F3");
  }
  async function googleFlow(withInvite = false) {
    lastFlow.current = withInvite ? "invite" : "google";
    const id = ++attempt.current;
    setSignInError(null);
    setGoogleWaiting(true);
    setState("A2");
    try {
      const key = await deviceKey().catch(() => {
        throw new Error("This browser can’t keep a sign-in key. Update it or try Chrome.");
      });
      const challenge = await api<ChallengeResponse>("/auth/challenge", {
        body: {
          kind: "google",
          publicKey: key.publicKey,
          ...(withInvite && inviteCode && { inviteCode }),
        },
      });
      const idToken = await googleIdToken(challenge.nonce, () => googleSlot.current);
      const session = await api<SessionResponse>("/auth/google", {
        body: { challengeId: challenge.id, idToken },
      });
      if (id !== attempt.current) return;
      signIn(session);
      setGoogleWaiting(false);
      /*
       * A new driver fills in their name, number and truck first. D6 then leads back to the
       * invite, which they accept there. Anyone else accepts the invite right away.
       */
      if (
        withInvite &&
        publicInvite?.type === "driver" &&
        session.profile.role === "driver" &&
        !session.profile.truckPlate
      )
        setState("D1");
      else if (withInvite && inviteCode) await acceptInvite();
      else if (session.profile.role === "driver" && !session.profile.truckPlate) setState("D1");
      else dashboard(HOME[session.profile.role] ?? "/start");
    } catch (error) {
      if (id !== attempt.current) return;
      setGoogleWaiting(false);
      if (
        error instanceof ApiError &&
        (error.code === "E_INVITE_USED" || error.code === "E_INVITE_EXPIRED")
      ) {
        setState("F4");
        return;
      }
      setSignInError(
        error instanceof ApiError
          ? error.status === 403
            ? "This Google account signs in another way. Ask the company for a new link."
            : error.message
          : error instanceof Error && error.message.startsWith("This browser")
            ? error.message
            : "Google sign-in did not finish. Try again.",
      );
      setState("A3");
    }
  }
  return {
    googleSlot,
    googleWaiting,
    setGoogleWaiting,
    publicInvite,
    liveInvite,
    shipperName,
    acceptInvite,
    googleFlow,
  };
}
export type GoogleSignIn = ReturnType<typeof useGoogleSignIn>;
