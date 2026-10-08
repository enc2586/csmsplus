// Extension pages follow the OS appearance; shadcn's dark tokens hang off the .dark class.
export function followSystemTheme() {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const apply = () => document.documentElement.classList.toggle("dark", media.matches);
  apply();
  media.addEventListener("change", apply);
}
