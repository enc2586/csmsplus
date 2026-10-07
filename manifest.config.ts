import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json" with { type: "json" };

const tracker = "src/features/assignment-tracker";

const manifest = {
  manifest_version: 3,
  name: "CSMS+",
  version: pkg.version,
  description: "Enhance your LMS experience",
  permissions: ["downloads", "storage"],
  action: {
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
      js: [
        "src/features/pdf-downloader/pdf-lib-global.js",
        "src/features/pdf-downloader/content.js",
      ],
      css: ["src/features/pdf-downloader/styles.css"],
    },
    {
      matches: ["https://lms.gist.ac.kr/course/view.php*"],
      js: [
        `${tracker}/content-scripts/tracker-config.js`,
        `${tracker}/content-scripts/tracker-utils.js`,
        `${tracker}/content-scripts/tracker-api.js`,
        `${tracker}/content-scripts/tracker-ui.js`,
        `${tracker}/content-scripts/tracker-dashboard.js`,
        `${tracker}/content-scripts/tracker-main.js`,
      ],
      css: [`${tracker}/styles/assignment-styles.css`],
    },
    {
      matches: ["https://lms.gist.ac.kr/", "https://lms.gist.ac.kr/index.php*"],
      js: [
        `${tracker}/content-scripts/tracker-utils.js`,
        `${tracker}/content-scripts/course-list-parser.js`,
      ],
      css: [`${tracker}/styles/course-stats-styles.css`],
    },
    {
      matches: ["https://lms.gist.ac.kr/mod/assign/view.php*"],
      js: [`${tracker}/content-scripts/assignment-cache-updater.js`],
    },
  ],
  icons: {
    16: "assets/icons/icon16.png",
    48: "assets/icons/icon48.png",
    128: "assets/icons/icon128.png",
  },
} satisfies Parameters<typeof defineManifest>[0];

export const contentScriptFiles = manifest.content_scripts.flatMap((script) => script.js);

export default defineManifest(manifest);
