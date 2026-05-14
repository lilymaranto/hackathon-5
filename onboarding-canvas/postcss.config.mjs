import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

const config = {
  plugins: {
    "@tailwindcss/postcss": {
      // Keep Tailwind resolution anchored to this app folder, not parent cwd/workspace roots.
      base: appRoot,
    },
  },
};

export default config;
