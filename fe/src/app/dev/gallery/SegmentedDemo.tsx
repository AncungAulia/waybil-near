"use client";

import { useState } from "react";
import { Segmented } from "@/components/ui/Segmented";

/** Segmented tabs only make sense when they can be clicked, so the gallery drives them. */
export function SegmentedDemo() {
  const [tab, setTab] = useState("active");

  return (
    <Segmented
      label="Which shipments to show"
      value={tab}
      onChange={setTab}
      options={[
        { value: "active", label: "Active" },
        { value: "paid", label: "Paid early" },
        { value: "history", label: "History" },
      ]}
    />
  );
}
