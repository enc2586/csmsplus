import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json" with { type: "json" };

const manifest = {
  manifest_version: 3,
  name: "CSMS+",
  version: pkg.version,
  description: "Enhance your LMS experience",
  permissions: ["storage", "alarms", "offscreen"],
  // Requested from the options page when reminders are turned on, so updating never prompts.
  optional_permissions: ["notifications"],
  action: {
    default_popup: "src/popup/index.html",
    default_icon: {
      16: "assets/icons/icon16.png",
      48: "assets/icons/icon48.png",
      128: "assets/icons/icon128.png",
    },
  },
  background: { service_worker: "src/background/index.ts", type: "module" },
  host_permissions: ["https://lms.gist.ac.kr/*", "https://doc.coursemos.co.kr/*"],
  options_ui: { page: "src/options/index.html", open_in_tab: true },
  content_scripts: [
    {
      matches: ["https://lms.gist.ac.kr/local/ubdoc/*"],
      js: ["src/content/pdf-viewer/index.tsx"],
    },
    {
      matches: ["https://lms.gist.ac.kr/course/view.php*"],
      js: ["src/content/course-page/index.tsx"],
    },
    {
      matches: ["https://lms.gist.ac.kr/", "https://lms.gist.ac.kr/index.php*"],
      js: ["src/content/home/index.tsx"],
    },
    {
      matches: ["https://lms.gist.ac.kr/mod/assign/view.php*"],
      js: ["src/content/assignment-page/index.ts"],
    },
  ],
  icons: {
    16: "assets/icons/icon16.png",
    48: "assets/icons/icon48.png",
    128: "assets/icons/icon128.png",
  },
} satisfies Parameters<typeof defineManifest>[0];

export default defineManifest(manifest);
