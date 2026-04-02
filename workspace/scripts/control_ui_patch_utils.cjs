const fs = require("fs");
const path = require("path");

const DEFAULT_CACHE_BUST_TOKEN = "20260401-qqcompactfix";

const SLASH_ENTER_ORIGINAL_LOGIC =
  "function xC(){X.slashMenuMode=`command`,X.slashMenuCommand=null,X.slashMenuArgItems=[],X.slashMenuItems=[]}function SC(e,t){let n=e.match(/^\\/(\\S+)\\s(.*)$/);if(n){let e=n[1].toLowerCase(),r=n[2].toLowerCase(),i=GS.find(t=>t.name===e);if(i?.argOptions?.length){let e=r?i.argOptions.filter(e=>e.toLowerCase().startsWith(r)):i.argOptions;if(e.length>0){X.slashMenuMode=`args`,X.slashMenuCommand=i,X.slashMenuArgItems=e,X.slashMenuOpen=!0,X.slashMenuIndex=0,X.slashMenuItems=[],t();return}}X.slashMenuOpen=!1,xC(),t();return}let r=e.match(/^\\/(\\S*)$/);if(r){let e=JS(r[1]);X.slashMenuItems=e,X.slashMenuOpen=e.length>0,X.slashMenuIndex=0,X.slashMenuMode=`command`,X.slashMenuCommand=null,X.slashMenuArgItems=[]}else X.slashMenuOpen=!1,xC();t()}function CC(e,t,n){if(e.argOptions?.length){t.onDraftChange(`/${e.name} `),X.slashMenuMode=`args`,X.slashMenuCommand=e,X.slashMenuArgItems=e.argOptions,X.slashMenuOpen=!0,X.slashMenuIndex=0,X.slashMenuItems=[],n();return}X.slashMenuOpen=!1,xC(),e.executeLocal&&!e.args?(t.onDraftChange(`/${e.name}`),n(),t.onSend()):(t.onDraftChange(`/${e.name} `),n())}";

const SLASH_ENTER_PATCHED_LOGIC =
  "function xC(){X.slashMenuMode=`command`,X.slashMenuCommand=null,X.slashMenuArgItems=[],X.slashMenuItems=[]}function SC(e,t){let n=e.match(/^\\/(\\S+)\\s(.*)$/);if(n){let e=n[1].toLowerCase(),r=n[2].toLowerCase(),i=GS.find(t=>t.name===e);if(i?.argOptions?.length){let e=r?i.argOptions.filter(e=>e.toLowerCase().startsWith(r)):i.argOptions;if(e.length>0){X.slashMenuMode=`args`,X.slashMenuCommand=i,X.slashMenuArgItems=e,X.slashMenuOpen=!0,X.slashMenuIndex=0,X.slashMenuItems=[],t();return}}X.slashMenuOpen=!1,xC(),t();return}let r=e.match(/^\\/(\\S*)$/);if(r){let e=JS(r[1]);X.slashMenuItems=e,X.slashMenuOpen=e.length>0,X.slashMenuIndex=0,X.slashMenuMode=`command`,X.slashMenuCommand=null,X.slashMenuArgItems=[]}else X.slashMenuOpen=!1,xC();t()}function OCX(e,t){let n=(t??``).trim().toLowerCase();if(!n.startsWith(`/`))return!1;if(n===`/${e.name}`.toLowerCase())return!0;let r=Array.isArray(e.aliases)?e.aliases:[];return r.some(t=>`/${t}`.toLowerCase()===n)}function CC(e,t,n,r=!1){if(e.argOptions?.length){t.onDraftChange(`/${e.name} `),X.slashMenuMode=`args`,X.slashMenuCommand=e,X.slashMenuArgItems=e.argOptions,X.slashMenuOpen=!0,X.slashMenuIndex=0,X.slashMenuItems=[],n();return}let i=OCX(e,r===!0?t.draft:void 0),a=e.executeLocal&&!e.args,o=e.args&&!i;X.slashMenuOpen=!1,xC(),a?(t.onDraftChange(`/${e.name}`),n(),t.onSend()):o?(t.onDraftChange(`/${e.name} `),n()):(t.onDraftChange(`/${e.name}`),n(),r===!0&&t.onSend())}";

const SLASH_ENTER_ORIGINAL_BRANCH =
  "case`Tab`:n.preventDefault(),wC(X.slashMenuItems[X.slashMenuIndex],e,g);return;case`Enter`:n.preventDefault(),CC(X.slashMenuItems[X.slashMenuIndex],e,g);return;case`Escape`:n.preventDefault(),X.slashMenuOpen=!1,xC(),g();return";

const SLASH_ENTER_PATCHED_BRANCH =
  "case`Tab`:n.preventDefault(),wC(X.slashMenuItems[X.slashMenuIndex],e,g);return;case`Enter`:n.preventDefault(),CC(X.slashMenuItems[X.slashMenuIndex],e,g,!0);return;case`Escape`:n.preventDefault(),X.slashMenuOpen=!1,xC(),g();return";

const COMPACT_ORIGINAL_FUNCTION =
  "async function Fw(e,t){try{return await e.request(`sessions.compact`,{key:t}),{content:`Context compacted successfully.`,action:`refresh`}}catch(e){return{content:`Compaction failed: ${String(e)}`}}}";

const COMPACT_PATCHED_FUNCTION =
  "async function Fw(e,t,n){try{let r=(n??``).trim(),i=await e.request(`chat.send`,{sessionKey:t,message:r?`/compact ${r}`:`/compact`,deliver:!1,idempotencyKey:cn()});return{content:`Compacting session...`,trackRunId:typeof i?.runId==`string`?i.runId:void 0}}catch(e){return{content:`Compaction failed: ${String(e)}`}}}";

const COMPACT_ORIGINAL_CASE = "case`compact`:return await Fw(e,t);";
const COMPACT_PATCHED_CASE = "case`compact`:return await Fw(e,t,r);";

function resolveInstalledControlUiRoot() {
  return path.join(
    process.env.APPDATA || "",
    "npm",
    "node_modules",
    "openclaw",
    "dist",
    "control-ui",
  );
}

function resolveWorkspaceLocalControlUiRoot(repoRoot = path.resolve(__dirname, "..")) {
  return path.join(repoRoot, "control-ui-local");
}

function resolveControlUiFiles(root) {
  const htmlPath = path.join(root, "index.html");
  const assetsDir = path.join(root, "assets");
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Control UI index.html not found: ${htmlPath}`);
  }
  if (!fs.existsSync(assetsDir)) {
    throw new Error(`Control UI assets dir not found: ${assetsDir}`);
  }
  const bundleName = fs
    .readdirSync(assetsDir)
    .find((entry) => /^index-.*\.js$/i.test(entry));
  if (!bundleName) {
    throw new Error(`Control UI index bundle not found under: ${assetsDir}`);
  }
  return {
    root,
    htmlPath,
    bundlePath: path.join(assetsDir, bundleName),
  };
}

function patchSlashEnterSource(source) {
  if (
    source.includes("function OCX(e,t)") &&
    source.includes("CC(X.slashMenuItems[X.slashMenuIndex],e,g,!0)")
  ) {
    return { source, changed: false };
  }
  if (
    !source.includes(SLASH_ENTER_ORIGINAL_LOGIC) ||
    !source.includes(SLASH_ENTER_ORIGINAL_BRANCH)
  ) {
    throw new Error("Expected slash-enter signatures not found in Control UI bundle.");
  }
  return {
    changed: true,
    source: source
      .replace(SLASH_ENTER_ORIGINAL_LOGIC, SLASH_ENTER_PATCHED_LOGIC)
      .replace(SLASH_ENTER_ORIGINAL_BRANCH, SLASH_ENTER_PATCHED_BRANCH),
  };
}

function patchCompactCommandSource(source) {
  if (
    source.includes("Compacting session...") &&
    source.includes("case`compact`:return await Fw(e,t,r);")
  ) {
    return { source, changed: false };
  }
  if (
    !source.includes(COMPACT_ORIGINAL_FUNCTION) ||
    !source.includes(COMPACT_ORIGINAL_CASE)
  ) {
    throw new Error("Expected compact-command signatures not found in Control UI bundle.");
  }
  return {
    changed: true,
    source: source
      .replace(COMPACT_ORIGINAL_FUNCTION, COMPACT_PATCHED_FUNCTION)
      .replace(COMPACT_ORIGINAL_CASE, COMPACT_PATCHED_CASE),
  };
}

function patchHtmlCacheBust(html, token = DEFAULT_CACHE_BUST_TOKEN) {
  const next = html.replace(
    /(\.\/assets\/[^"'?#]+\.(?:js|css))(?:\?v=[^"'#\s]+)?/g,
    `$1?v=${token}`,
  );
  return {
    html: next,
    changed: next !== html,
  };
}

function patchControlUiRoot(
  root,
  {
    patchSlashEnter = true,
    patchCompactCommand = true,
    cacheBustToken = DEFAULT_CACHE_BUST_TOKEN,
  } = {},
) {
  const files = resolveControlUiFiles(root);
  let bundleSource = fs.readFileSync(files.bundlePath, "utf8");
  let bundleChanged = false;
  const operations = [];

  if (patchSlashEnter) {
    const patched = patchSlashEnterSource(bundleSource);
    bundleSource = patched.source;
    if (patched.changed) {
      bundleChanged = true;
      operations.push("slash-enter");
    }
  }

  if (patchCompactCommand) {
    const patched = patchCompactCommandSource(bundleSource);
    bundleSource = patched.source;
    if (patched.changed) {
      bundleChanged = true;
      operations.push("compact-command");
    }
  }

  if (bundleChanged) {
    fs.writeFileSync(files.bundlePath, bundleSource, "utf8");
  }

  const htmlSource = fs.readFileSync(files.htmlPath, "utf8");
  const htmlPatched = patchHtmlCacheBust(htmlSource, cacheBustToken);
  if (htmlPatched.changed) {
    fs.writeFileSync(files.htmlPath, htmlPatched.html, "utf8");
    operations.push("cache-bust");
  }

  return {
    ...files,
    changed: bundleChanged || htmlPatched.changed,
    operations,
  };
}

module.exports = {
  DEFAULT_CACHE_BUST_TOKEN,
  patchSlashEnterSource,
  patchCompactCommandSource,
  patchHtmlCacheBust,
  patchControlUiRoot,
  resolveControlUiFiles,
  resolveInstalledControlUiRoot,
  resolveWorkspaceLocalControlUiRoot,
};
