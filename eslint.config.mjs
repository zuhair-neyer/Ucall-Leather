import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"
export default defineConfig([
  ...nextVitals, ...nextTypescript,
  // Existing Firebase subscriptions intentionally synchronize external state in effects.
  { rules: { "react-hooks/set-state-in-effect": "off" } },
  globalIgnores([".next/**", ".next-e2e/**", "node_modules/**", "next-env.d.ts", "test-results/**", "playwright-report/**", "playwright-emulator-report/**"]),
])
