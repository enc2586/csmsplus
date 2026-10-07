// Stands in for jsPDF's optional HTML/SVG renderers (html2canvas, canvg, dompurify), which
// are not installed because this extension only embeds PNG pages.
throw new Error("This jsPDF feature is not bundled with the extension.");
