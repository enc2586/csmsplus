import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import pkg from "../package.json" with { type: "json" };

const output = resolve("release", `csmsplus-v${pkg.version}.zip`);
mkdirSync("release", { recursive: true });
rmSync(output, { force: true });
execFileSync("zip", ["-qr", output, "."], { cwd: "dist", stdio: "inherit" });
console.log(`Packaged ${output}`);
