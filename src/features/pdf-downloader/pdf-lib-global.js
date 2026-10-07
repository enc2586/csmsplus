// pdf-lib.min.js is a UMD bundle. Bundled as an IIFE it takes the CommonJS branch and
// never sets window.PDFLib, which content.js reads, so the global is assigned here.
import * as PDFLib from "./pdf-lib.min.js";

window.PDFLib = PDFLib;
