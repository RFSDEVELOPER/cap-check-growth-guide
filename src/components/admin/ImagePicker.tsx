import { ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";

/** Shows the current photo and lets the admin choose a new file (uploaded on save). */
export function ImagePicker({ current, onFile }: { current: string; onFile: (file: File | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <label className="group relative block aspect-square w-32 cursor-pointer overflow-hidden rounded-2xl bg-sage">
      <img src={preview ?? current} alt="Foto do produto" className="h-full w-full object-cover" />
      <span className="absolute inset-0 grid place-items-center bg-foreground/40 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100">
        <span className="flex flex-col items-center gap-1">
          <ImagePlus className="size-5" /> Trocar foto
        </span>
      </span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          onFile(file);
          setPreview(file ? URL.createObjectURL(file) : null);
        }}
      />
    </label>
  );
}
