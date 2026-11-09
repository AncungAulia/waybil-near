import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/credit-once.ts", "src/jobs-once.ts"],
  format: ["esm"],
  target: "node22",
  clean: true,
  noExternal: ["@waybil/shared"],
});
