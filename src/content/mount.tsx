import { type ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import css from "../styles/tailwind.css?inline";

let sheet: CSSStyleSheet | undefined;

// Browsers ignore @property rules inside shadow roots, and Tailwind declares the initial
// values of its --tw-* variables with them. Without these on the page, shadow, ring and
// transform utilities silently render nothing.
function sharedSheet(): CSSStyleSheet {
  if (sheet) return sheet;
  const properties = document.createElement("style");
  properties.textContent = css.match(/@property[^{]+\{[^}]*\}/g)?.join("\n") ?? "";
  document.head.append(properties);
  sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  return sheet;
}

// The host takes no box of its own (display: contents), so the shadow content lays out
// as if it were a direct child of wherever the host is inserted.
export function mount(host: HTMLElement, children: ReactNode): () => void {
  host.style.display = "contents";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.adoptedStyleSheets = [sharedSheet()];
  const root = createRoot(shadow);
  root.render(<StrictMode>{children}</StrictMode>);
  return () => root.unmount();
}
