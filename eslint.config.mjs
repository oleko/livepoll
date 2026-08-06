import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // core/ never imports from modules/ or app/ — if core needs to know
  // something about a specific poll/slide/mode type, that's a bug in core,
  // not a missing import. The registries (core/registry/*) are the one
  // sanctioned exception: wiring modules together is their whole job.
  {
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/modules/*", "@/app/*"],
          message: "core/ must not import from modules/ or app/. If core needs to know about a specific type, that belongs in a module, not core.",
        }],
      }],
    },
  },
  {
    files: ["src/core/registry/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  // modules/a/* never imports modules/b/* — they interact only through
  // core (a registry, a shared event, a shared component), never directly.
  {
    files: ["src/modules/polls/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/modules/slides/*", "@/modules/modes/*"],
          message: "modules/polls must not import other module families directly — interact only through core.",
        }],
      }],
    },
  },
  {
    files: ["src/modules/slides/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/modules/polls/*", "@/modules/modes/*"],
          message: "modules/slides must not import other module families directly — interact only through core.",
        }],
      }],
    },
  },
  {
    files: ["src/modules/modes/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/modules/polls/*", "@/modules/slides/*"],
          message: "modules/modes must not import other module families directly — interact only through core.",
        }],
      }],
    },
  },
]);

export default eslintConfig;
