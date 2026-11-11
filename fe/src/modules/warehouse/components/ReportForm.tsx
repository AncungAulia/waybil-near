import { Camera, Check, Image as ImageIcon, Info, PaperPlaneTilt } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export interface ReportPhoto {
  name: string;
  src: string;
}

/*
 * Report photos travel to the driver's screen through localStorage, which holds only a few
 * MB. Each photo is shrunk to a small JPEG thumbnail first, so a report always fits.
 */
const THUMB_SIDE = 240;
function thumbnail(file: File) {
  return new Promise<ReportPhoto>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, THUMB_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const context = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!context) return reject(new Error("canvas"));
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ name: file.name, src: canvas.toDataURL("image/jpeg", 0.6) });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("read"));
    };
    img.src = url;
  });
}
/* Six thumbnails stay well under the browser's storage limit. */
const MAX_PHOTOS = 6;

/** W2.7, Lena reports what is wrong with the delivery. */
export function ReportForm({
  reasons,
  setReasons,
  qty,
  setQty,
  note,
  setNote,
  photos,
  setPhotos,
  setError,
  submitting,
  onSend,
  onCancel,
}: {
  reasons: string[];
  setReasons: (reasons: string[]) => void;
  qty: string;
  setQty: (qty: string) => void;
  note: string;
  setNote: (note: string) => void;
  photos: ReportPhoto[];
  setPhotos: (photos: ReportPhoto[]) => void;
  setError: (error: string) => void;
  submitting: boolean;
  onSend: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <Panel className="warehouse-report" gap={18}>
        <fieldset>
          <legend className="mb-12 text-label">What’s wrong?</legend>
          <div className="flex flex-wrap gap-8">
            {["Damaged", "Missing items", "Wrong goods", "Other"].map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reasons.includes(r)}
                onClick={() =>
                  setReasons(reasons.includes(r) ? reasons.filter((v) => v !== r) : [...reasons, r])
                }
                className={cn(
                  "tap focus-ring rounded-full px-16 py-10 text-label",
                  reasons.includes(r)
                    ? "bg-ds-ink text-ds-bg"
                    : "bg-ds-canvas hover:bg-ds-canvas-hover",
                )}
              >
                {reasons.includes(r) && <Check size={14} className="mr-6 inline" />}
                {r}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="text-label">
          How many crates are in good shape?
          <span className="warehouse-quantity mt-8 flex items-center gap-10">
            <input
              inputMode="numeric"
              type="number"
              min={0}
              max={120}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="focus-ring w-full rounded-small border border-ds-warning bg-ds-bg p-16 text-heading"
            />
            <span className="text-body text-ds-muted">of 120</span>
          </span>
        </label>
        <p className="text-caption text-ds-warning">
          {Math.max(0, 120 - Number(qty))} crates are damaged. This goes into your report.
        </p>
        <label className="text-label">
          What happened
          <textarea
            rows={1}
            wrap="off"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="focus-ring mt-8 min-h-48 w-full resize-y rounded-small bg-ds-canvas p-16 text-body"
          />
        </label>
        <div>
          <p className="mb-8 text-label">Photos</p>
          <div className="flex flex-wrap gap-8">
            {photos.length
              ? photos.map((photo, i) => (
                  <button
                    key={photo.name + i}
                    type="button"
                    aria-label={`Remove ${photo.name}`}
                    className="press focus-ring rounded-small"
                    onClick={() => setPhotos(photos.filter((_, n) => n !== i))}
                  >
                    <img
                      src={photo.src}
                      alt={photo.name}
                      className="size-72 rounded-small object-cover"
                    />
                  </button>
                ))
              : [1, 2].map((n) => (
                  <span
                    key={n}
                    className="grid size-72 place-items-center rounded-small bg-ds-canvas text-ds-muted"
                  >
                    <ImageIcon size={22} />
                  </span>
                ))}
            <label className="press focus-ring flex size-72 cursor-pointer flex-col items-center justify-center gap-4 rounded-small border-[1.5px] border-ds-line-strong text-caption font-medium">
              <Camera size={20} />
              <span>Add</span>
              <input
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (
                    files.some(
                      (f) =>
                        f.size > 20 * 1024 * 1024 || !["image/jpeg", "image/png"].includes(f.type),
                    )
                  ) {
                    setError("Choose JPG or PNG photos under 20 MB each.");
                    return;
                  }
                  if (photos.length + files.length > MAX_PHOTOS) {
                    setError(`Add up to ${MAX_PHOTOS} photos.`);
                    return;
                  }
                  const results = await Promise.all(files.map(thumbnail)).catch(() => null);
                  if (results) {
                    setPhotos([...photos, ...results]);
                    setError("");
                  } else setError("The photos could not be read. Please try again.");
                }}
              />
            </label>
          </div>
        </div>
      </Panel>
      <p className="my-16 flex gap-10 rounded-row bg-ds-brand-soft p-16 text-label">
        <Info size={18} className="shrink-0" />
        Sam won’t be paid early until Northwind settles this with him.
      </p>
      <div className="warehouse-actions warehouse-report-actions flex flex-col gap-12 md:flex-row-reverse md:justify-center">
        <Button
          icon={<PaperPlaneTilt size={17} />}
          className="h-52 w-full justify-between md:w-fit"
          disabled={submitting}
          onClick={onSend}
        >
          Send report
        </Button>
        <Button variant="quiet" className="w-full justify-center md:w-fit" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </>
  );
}
