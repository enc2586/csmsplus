import { useState } from "react";
import { cn } from "../../ui/cn.ts";
import { ProgressRing } from "../../ui/progress-ring.tsx";
import { type DocumentParams, downloadPages, makePdf } from "./make-pdf.ts";

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DownloadButton({ params }: { params: DocumentParams }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const reset = () => {
    setBusy(false);
    setProgress(0);
    setMessage(null);
  };

  const download = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("Scanning pages...");
    try {
      const pages = await downloadPages(params, (page) => {
        setMessage(`Scanning page ${page}...`);
        setProgress(page / (page + 1));
      });
      if (pages.length === 0) {
        alert("No images found to download");
        reset();
        return;
      }

      setMessage("Creating PDF...");
      setProgress(0);
      // Yields so the progress text paints before the synchronous PDF build starts.
      await new Promise((resolve) => setTimeout(resolve));
      const pdf = makePdf(pages, (page) => {
        setMessage(`Adding page ${page}/${pages.length} to PDF...`);
        setProgress(page / pages.length);
      });

      setMessage("Saving PDF...");
      save(pdf, params.name);
      setMessage("Complete!");
      setProgress(1);
      setTimeout(reset, 2000);
    } catch (error) {
      alert(`Failed to create PDF: ${(error as Error).message}`);
      reset();
    }
  };

  return (
    <>
      <button
        type="button"
        title="Download as PDF"
        aria-label="PDF로 다운로드"
        onClick={() => void download()}
        className={cn(
          "fixed right-20 bottom-20 z-[10000] flex h-56 w-56 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-black shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all duration-300 hover:scale-110 hover:shadow-[0_6px_16px_rgba(0,0,0,0.4)] active:scale-95",
          busy && "cursor-not-allowed opacity-70 hover:scale-100",
        )}
      >
        <ProgressRing
          progress={progress}
          size={62}
          radius={28}
          strokeWidth={3}
          className="absolute top-1/2 left-1/2 -translate-1/2"
          barClassName="stroke-success"
        />
        <svg
          viewBox="0 0 24 24"
          className="h-28 w-28 fill-none stroke-white stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
      {message && (
        <div className="fixed right-85 bottom-28 z-[10000] rounded-[20px] bg-black/85 px-16 py-8 font-sans text-13 font-medium whitespace-nowrap text-white shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          {message}
        </div>
      )}
    </>
  );
}
