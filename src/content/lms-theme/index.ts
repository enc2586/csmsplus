import { loadOptions, type Options, watchOptions } from "../../shared/options.ts";

type DarkReader = typeof import("darkreader");
let darkReader: DarkReader | null = null;

const theme = { brightness: 100, contrast: 90, sepia: 0 };

const prefersDark = matchMedia("(prefers-color-scheme: dark)");
let mode: Options["appearance"]["darkMode"] = "off";

// The extension's own UI lives in shadow roots that Dark Reader does not reach; its
// stylesheet switches palettes on this attribute instead.
function markTheme() {
  const dark = mode === "on" || (mode === "system" && prefersDark.matches);
  document.documentElement.dataset.csmsTheme = dark ? "dark" : "light";
}
prefersDark.addEventListener("change", markTheme);

// This script runs on every LMS page, so Dark Reader is loaded only once dark mode is on.
async function apply(next: Options["appearance"]["darkMode"]) {
  mode = next;
  markTheme();
  if (mode === "off") {
    darkReader?.auto(false);
    darkReader?.disable();
    return;
  }
  darkReader ??= await import("darkreader");
  // Dark Reader re-fetches stylesheets to recolor them; the default would be blocked as
  // cross-origin, while the content script's fetch uses the extension's host permission.
  darkReader.setFetchMethod((url) => fetch(url));
  if (mode === "on") {
    darkReader.auto(false);
    darkReader.enable(theme);
  } else {
    darkReader.auto(theme);
  }
}

void loadOptions().then((options) => apply(options.appearance.darkMode));
watchOptions((options) => void apply(options.appearance.darkMode));
