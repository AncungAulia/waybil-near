"use client";
import { useState } from "react";
import type { InviteCreatedResponse } from "@waybil/shared";
import { Copy } from "@phosphor-icons/react";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { Alert, failure } from "./shared";
import { PhoneInput } from "@/components/elements/PhoneInput";
import { dialCode, phoneError, toE164 } from "@/lib/phone";

export function InviteSheet({
  type,
  onClose,
  onSent,
}: {
  type: "driver" | "warehouse";
  onClose: () => void;
  onSent: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  /* Indonesia first, since most demo trucks run there. The picker lists every country. */
  const [phoneCountry, setPhoneCountry] = useState("ID");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /* The number as the backend wants it (E.164), or undefined while it isn't valid. */
  const e164 = toE164(phone, phoneCountry);
  const phoneOk = !!e164;
  const ready = name.trim() && phoneOk && (type === "driver" || address.trim());

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const result = await api<InviteCreatedResponse>("/invites", {
        body: {
          type,
          name: name.trim(),
          phone: e164,
          ...(type === "warehouse" && { address: address.trim() }),
        },
      });
      setLink(result.link);
      onSent();
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionSheet
      title={type === "driver" ? "Invite a driver" : "Add a destination"}
      onClose={onClose}
    >
      {link ? (
        <>
          <p className="text-label">
            Send this link to {name.trim()}. Once they accept it, add them to your network here.
          </p>
          <p className="rounded-row bg-ds-canvas p-14 text-label break-all">{link}</p>
          <Button
            icon={<Copy size={17} />}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Link copied" : "Copy the link"}
          </Button>
          <Button variant="quiet" onClick={onClose}>
            Done
          </Button>
        </>
      ) : (
        <>
          <Input
            label={type === "driver" ? "Driver’s name" : "Destination name"}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <PhoneInput
            label={type === "driver" ? "WhatsApp number" : "Receiver’s WhatsApp number"}
            value={phone}
            onChange={setPhone}
            code={dialCode(phoneCountry)}
            onCodeChange={() => {}}
            country={phoneCountry}
            onCountryChange={setPhoneCountry}
            showHint={false}
            error={
              phone.replace(/\D/g, "").length > 5 && !phoneOk
                ? phoneError(phone, phoneCountry)
                : undefined
            }
          />
          {type === "warehouse" && (
            <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          )}
          {error && <Alert>{error}</Alert>}
          <Button
            disabled={!ready}
            loading={busy}
            loadingLabel="Sending"
            onClick={() => void send()}
          >
            Make the invite link
          </Button>
        </>
      )}
    </ActionSheet>
  );
}
