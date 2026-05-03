import esbuild from "esbuild";
import process from "node:process";
import builtins from "builtin-modules";

const prod = process.argv.includes("production");

const context = await esbuild.context({
  bundle: true,
  entryPoints: ["src/main.ts"],
  external: ["obsidian", "electron", "@codemirror/state", "@codemirror/view", ...builtins],
  format: "cjs",
  logLevel: "info",
  outfile: "main.js",
  platform: "node",
  sourcemap: prod ? false : "inline",
  target: "es2018",
});

if (prod) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
