import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../styles/tailwind.css";
import { followSystemTheme } from "../ui/system-theme.ts";
import { App } from "./app.tsx";

followSystemTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
