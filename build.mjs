// Builds the voice lab into one self-contained page: docs/index.html
import { compile } from "svelte/compiler";
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const svelte = {
  name: "svelte",
  setup(b) {
    b.onLoad({ filter: /\.svelte$/ }, (args) => ({
      contents: compile(readFileSync(args.path, "utf8"), { filename: args.path, css: "injected" }).js.code,
      loader: "js"
    }));
  }
};

const out = await build({ entryPoints: ["src/main.js"], bundle: true, minify: true, format: "esm", write: false, conditions: ["browser", "svelte"], plugins: [svelte] });
const js = out.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const desc = "Seven ways an AI coding agent can talk while it works, run on the same recorded task and scored.";
mkdirSync("docs", { recursive: true });
writeFileSync("docs/index.html", `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Voice lab: compare 7 voice designs</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="Voice lab: compare 7 voice designs">
<meta property="og:description" content="${desc}">
<style>html,body{background:#0f1115;color-scheme:dark}</style>
</head>
<body>
<div id="app"></div>
<script type="module">${js}</script>
</body>
</html>
`);
console.log("built docs/index.html");
