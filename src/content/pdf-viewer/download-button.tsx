import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "../../ui/cn.ts";
import { ProgressRing } from "../../ui/progress-ring.tsx";
import { Button } from "../../ui/shadcn/button.tsx";
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
      <Button
        title="Download as PDF"
        aria-label="PDF로 다운로드"
        disabled={busy}
        onClick={() => void download()}
        className="fixed right-5 bottom-5 z-10000 size-14 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-80 [&_svg:not([class*='size-'])]:size-6"
      >
        <ProgressRing
          progress={progress}
          size={62}
          radius={28}
          strokeWidth={3}
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-1/2"
          barClassName={cn("stroke-success")}
        />
        {busy ? <LoaderCircle className="animate-spin" /> : <Download />}
      </Button>
      {message && (
        <div className="fixed right-21.25 bottom-8 z-10000 rounded-md border bg-popover px-3 py-1.5 font-sans text-sm whitespace-nowrap text-popover-foreground shadow-md">
          {message}
        </div>
      )}
    </>
  );
}
