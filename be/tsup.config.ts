import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/credit-once.ts"],
  format: ["esm"],
  target: "node22",
  clean: true,
  noExternal: ["@waybil/shared"],
});
