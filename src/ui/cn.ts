import { createCn } from "cn/config";

// The theme names font sizes by pixel value (text-13). Without registering them, the
// merger reads text-13 as a color and drops it when a text color is also given.
export const cn = createCn({
  extend: { theme: { text: [(value: string) => /^\d+$/.test(value)] } },
});
