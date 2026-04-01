const fs = require("fs");
const path = require("path");

const bundlePath = path.join(
  process.env.APPDATA || "",
  "npm",
  "node_modules",
  "openclaw",
  "dist",
  "control-ui",
  "assets",
  "index-BsGEx55J.js",
);

const htmlPath = path.join(
  process.env.APPDATA || "",
  "npm",
  "node_modules",
  "openclaw",
  "dist",
  "control-ui",
  "index.html",
);

const originalLogic =
  "function xC(){X.slashMenuMode=`command`,X.slashMenuCommand=null,X.slashMenuArgItems=[],X.slashMenuItems=[]}function SC(e,t){let n=e.match(/^\\/(\\S+)\\s(.*)$/);if(n){let e=n[1].toLowerCase(),r=n[2].toLowerCase(),i=GS.find(t=>t.name===e);if(i?.argOptions?.length){let e=r?i.argOptions.filter(e=>e.toLowerCase().startsWith(r)):i.argOptions;if(e.length>0){X.slashMenuMode=`args`,X.slashMenuCommand=i,X.slashMenuArgItems=e,X.slashMenuOpen=!0,X.slashMenuIndex=0,X.slashMenuItems=[],t();return}}X.slashMenuOpen=!1,xC(),t();return}let r=e.match(/^\\/(\\S*)$/);if(r){let e=JS(r[1]);X.slashMenuItems=e,X.slashMenuOpen=e.length>0,X.slashMenuIndex=0,X.slashMenuMode=`command`,X.slashMenuCommand=null,X.slashMenuArgItems=[]}else X.slashMenuOpen=!1,xC();t()}function CC(e,t,n){if(e.argOptions?.length){t.onDraftChange(`/${e.name} `),X.slashMenuMode=`args`,X.slashMenuCommand=e,X.slashMenuArgItems=e.argOptions,X.slashMenuOpen=!0,X.slashMenuIndex=0,X.slashMenuItems=[],n();return}X.slashMenuOpen=!1,xC(),e.executeLocal&&!e.args?(t.onDraftChange(`/${e.name}`),n(),t.onSend()):(t.onDraftChange(`/${e.name} `),n())}";

const patchedLogic =
  "function xC(){X.slashMenuMode=`command`,X.slashMenuCommand=null,X.slashMenuArgItems=[],X.slashMenuItems=[]}function SC(e,t){let n=e.match(/^\\/(\\S+)\\s(.*)$/);if(n){let e=n[1].toLowerCase(),r=n[2].toLowerCase(),i=GS.find(t=>t.name===e);if(i?.argOptions?.length){let e=r?i.argOptions.filter(e=>e.toLowerCase().startsWith(r)):i.argOptions;if(e.length>0){X.slashMenuMode=`args`,X.slashMenuCommand=i,X.slashMenuArgItems=e,X.slashMenuOpen=!0,X.slashMenuIndex=0,X.slashMenuItems=[],t();return}}X.slashMenuOpen=!1,xC(),t();return}let r=e.match(/^\\/(\\S*)$/);if(r){let e=JS(r[1]);X.slashMenuItems=e,X.slashMenuOpen=e.length>0,X.slashMenuIndex=0,X.slashMenuMode=`command`,X.slashMenuCommand=null,X.slashMenuArgItems=[]}else X.slashMenuOpen=!1,xC();t()}function OCX(e,t){let n=(t??``).trim().toLowerCase();if(!n.startsWith(`/`))return!1;if(n===`/${e.name}`.toLowerCase())return!0;let r=Array.isArray(e.aliases)?e.aliases:[];return r.some(t=>`/${t}`.toLowerCase()===n)}function CC(e,t,n,r=!1){if(e.argOptions?.length){t.onDraftChange(`/${e.name} `),X.slashMenuMode=`args`,X.slashMenuCommand=e,X.slashMenuArgItems=e.argOptions,X.slashMenuOpen=!0,X.slashMenuIndex=0,X.slashMenuItems=[],n();return}let i=OCX(e,r===!0?t.draft:void 0),a=e.executeLocal&&!e.args,o=e.args&&!i;X.slashMenuOpen=!1,xC(),a?(t.onDraftChange(`/${e.name}`),n(),t.onSend()):o?(t.onDraftChange(`/${e.name} `),n()):(t.onDraftChange(`/${e.name}`),n(),r===!0&&t.onSend())}";

const originalEnterBranch =
  "case`Tab`:n.preventDefault(),wC(X.slashMenuItems[X.slashMenuIndex],e,g);return;case`Enter`:n.preventDefault(),CC(X.slashMenuItems[X.slashMenuIndex],e,g);return;case`Escape`:n.preventDefault(),X.slashMenuOpen=!1,xC(),g();return";

const patchedEnterBranch =
  "case`Tab`:n.preventDefault(),wC(X.slashMenuItems[X.slashMenuIndex],e,g);return;case`Enter`:n.preventDefault(),CC(X.slashMenuItems[X.slashMenuIndex],e,g,!0);return;case`Escape`:n.preventDefault(),X.slashMenuOpen=!1,xC(),g();return";

function main() {
  if (!fs.existsSync(bundlePath)) {
    console.error(`Control UI bundle not found: ${bundlePath}`);
    process.exit(1);
  }

  const source = fs.readFileSync(bundlePath, "utf8");

  let changed = false;

  if (!(source.includes("function OCX(e,t)") && source.includes("CC(X.slashMenuItems[X.slashMenuIndex],e,g,!0)"))) {
    if (!source.includes(originalLogic) || !source.includes(originalEnterBranch)) {
      console.error("Expected Control UI slash-enter signatures not found. Bundle may have changed.");
      process.exit(1);
    }

    const next = source
      .replace(originalLogic, patchedLogic)
      .replace(originalEnterBranch, patchedEnterBranch);

    fs.writeFileSync(bundlePath, next, "utf8");
    changed = true;
  }

  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, "utf8");
    if (!html.includes("v=20260401-slashfix")) {
      const nextHtml = html
        .replace("./assets/index-BsGEx55J.js", "./assets/index-BsGEx55J.js?v=20260401-slashfix")
        .replace("./assets/event-stream-B8X6sYaV.js", "./assets/event-stream-B8X6sYaV.js?v=20260401-slashfix")
        .replace("./assets/preload-helper-xBbMyY7u.js", "./assets/preload-helper-xBbMyY7u.js?v=20260401-slashfix")
        .replace("./assets/lit-zdTgzAJI.js", "./assets/lit-zdTgzAJI.js?v=20260401-slashfix")
        .replace("./assets/directive-C6NBp6xJ.js", "./assets/directive-C6NBp6xJ.js?v=20260401-slashfix")
        .replace("./assets/format-Cbj45nru.js", "./assets/format-Cbj45nru.js?v=20260401-slashfix")
        .replace("./assets/index-Bhjki1_a.css", "./assets/index-Bhjki1_a.css?v=20260401-slashfix");
      fs.writeFileSync(htmlPath, nextHtml, "utf8");
      changed = true;
    }
  }

  console.log(
    changed
      ? `Patched Control UI slash-enter behavior: ${bundlePath}`
      : "Control UI slash-enter patch already applied.",
  );
}

main();
