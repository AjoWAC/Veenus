import fs from "fs";
import path from "path";

const SRC_DIR = "src";
const DIST_DIR = ".";
const COMPONENTS_DIR = path.join(SRC_DIR, "components");

// safe file read
function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (e) {
    console.error("❌ Missing file:", filePath);
    return "";
  }
}

/* ------------------------------------------------------
    PROCESS data-include
-------------------------------------------------------- */
function processIncludes(html) {
  const regex = /<div[^>]*data-include="([^"]+)"[^>]*><\/div>/gi;

  return html.replace(regex, (match, includeFile) => {
    const includePath = path.join(COMPONENTS_DIR, includeFile);
    let content = readFileSafe(includePath).trim();
    return processAll(content);
  });
}

/* ------------------------------------------------------
    Extract attributes from tag
-------------------------------------------------------- */
function getAttributes(tag) {
  const attrs = {};
  const attrRegex = /([\w-]+)="([^"]*)"/g;

  let m;
  while ((m = attrRegex.exec(tag))) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

/* ------------------------------------------------------
    Replace props inside component
    Supports:
    data-label → {{label}}
    data-icon  → {{icon}}
    data-url   → {{url}}
-------------------------------------------------------- */
function applyProps(content, attrs) {
  Object.keys(attrs).forEach((key) => {
    const value = attrs[key];

    // Replace {{data-label}}
    content = content.replace(new RegExp(`{{${key}}}`, "g"), value);

    // Replace {{label}} from data-label
    if (key.startsWith("data-")) {
      const shortKey = key.replace("data-", "");
      content = content.replace(new RegExp(`{{${shortKey}}}`, "g"), value);
    }
  });

  return content;
}

/* ------------------------------------------------------
    PROCESS data-component
-------------------------------------------------------- */
function processComponents(html) {
  // BUTTON COMPONENT
  html = html.replace(
    /<div([^>]*)data-component="button"([^>]*)><\/div>/gi,
    (match, before, after) => {
      const tag = `<div${before}data-component="button"${after}></div>`;
      const attrs = getAttributes(tag);

      const type = attrs["data-type"];
      if (!type) return match;

      const filePath = path.join(COMPONENTS_DIR, "buttons", `${type}.html`);
      let content = readFileSafe(filePath).trim();

      content = applyProps(content, attrs);
      return processAll(content);
    }
  );

  // CARD COMPONENT
  html = html.replace(
    /<div([^>]*)data-component="card"([^>]*)><\/div>/gi,
    (match, before, after) => {
      const tag = `<div${before}data-component="card"${after}></div>`;
      const attrs = getAttributes(tag);

      const type = attrs["data-type"];
      if (!type) return match;

      const filePath = path.join(COMPONENTS_DIR, "cards", `${type}.html`);
      let content = readFileSafe(filePath).trim();

      content = applyProps(content, attrs);
      return processAll(content);
    }
  );

  // LABEL COMPONENT
  html = html.replace(
    /<div([^>]*)data-component="label"([^>]*)><\/div>/gi,
    (match, before, after) => {
      const tag = `<div${before}data-component="label"${after}></div>`;
      const attrs = getAttributes(tag);

      const type = attrs["data-type"] || "default";
      if (!type) return match;

      const filePath = path.join(COMPONENTS_DIR, "labels", `${type}.html`);
      let content = readFileSafe(filePath).trim();

      content = applyProps(content, attrs);
      return processAll(content);
    }
  );

  // SLIDER COMPONENT
  html = html.replace(
    /<div([^>]*)data-component="slider"([^>]*)><\/div>/gi,
    (match, before, after) => {
      const tag = `<div${before}data-component="slider"${after}></div>`;
      const attrs = getAttributes(tag);

      const sliderName = attrs["data-slider"];
      if (!sliderName) return match;

      const filePath = path.join(COMPONENTS_DIR, "sliders", `${sliderName}.html`);
      let content = readFileSafe(filePath).trim();

      content = applyProps(content, attrs);
      return processAll(content);
    }
  );

  return html;
}

/* ------------------------------------------------------
    Run all processors
-------------------------------------------------------- */
function processAll(html) {
  html = processIncludes(html);
  html = processComponents(html);
  return html;
}

/* ------------------------------------------------------
    Build one HTML file
-------------------------------------------------------- */
function buildHTMLFile(filename) {
  const srcPath = path.join(SRC_DIR, filename);
  const outputPath = path.join(DIST_DIR, filename);

  let html = readFileSafe(srcPath);
  html = processAll(html);

  fs.writeFileSync(outputPath, html, "utf8");
  console.log("✅ Built:", outputPath);
}

/* ------------------------------------------------------
    Build whole project
-------------------------------------------------------- */
function build() {
  const htmlFiles = fs
    .readdirSync(SRC_DIR)
    .filter((file) => file.endsWith(".html"));

  htmlFiles.forEach(buildHTMLFile);
  console.log("🎉 Build complete!");
}

/* ------------------------------------------------------
    Debounce
-------------------------------------------------------- */
let timeout = null;
function debounce(fn, delay = 200) {
  clearTimeout(timeout);
  timeout = setTimeout(fn, delay);
}

/* ------------------------------------------------------
    Watch mode
-------------------------------------------------------- */
function watch() {
  console.log("👀 Watching for changes in src/...");

  fs.watch(SRC_DIR, { recursive: true }, (eventType, filename) => {
    if (!filename) return;

    if (
      filename.endsWith(".html") ||
      filename.endsWith(".css") ||
      filename.endsWith(".js")
    ) {
      console.log(`🔄 Change detected: ${filename}`);
      debounce(build, 200);
    }
  });
}

build();
watch();
