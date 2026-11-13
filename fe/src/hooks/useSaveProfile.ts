"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Profile } from "@waybil/shared";
import { api, readSession, saveSession } from "@/lib/api";
import { qk } from "@/lib/queryKeys";

/**
 * Saves the signed-in person's name, phone or truck plate (PUT /me/profile). The session and
 * the cached profile keep the answer, and the name other screens show is read again.
 */
export function useSaveProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; phone?: string; truckPlate?: string }) =>
      api<Profile>("/me/profile", { method: "PUT", body }),
    onSuccess: (updated) => {
      const current = readSession();
      if (current) saveSession({ ...current, profile: updated });
      client.setQueryData(qk.me(), updated);
      void client.invalidateQueries({ queryKey: qk.names(updated.accountId) });
    },
  });
}
