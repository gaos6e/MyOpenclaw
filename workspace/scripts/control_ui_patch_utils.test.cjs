const test = require("node:test");
const assert = require("node:assert/strict");

const {
  patchCompactCommandSource,
  patchHtmlCacheBust,
  patchSlashEnterSource,
} = require("./control_ui_patch_utils.cjs");

test("patchSlashEnterSource upgrades exact slash matches to send on first Enter", () => {
  const sample =
    "AAA" +
    "function xC(){X.slashMenuMode=`command`,X.slashMenuCommand=null,X.slashMenuArgItems=[],X.slashMenuItems=[]}function SC(e,t){let n=e.match(/^\\/(\\S+)\\s(.*)$/);if(n){let e=n[1].toLowerCase(),r=n[2].toLowerCase(),i=GS.find(t=>t.name===e);if(i?.argOptions?.length){let e=r?i.argOptions.filter(e=>e.toLowerCase().startsWith(r)):i.argOptions;if(e.length>0){X.slashMenuMode=`args`,X.slashMenuCommand=i,X.slashMenuArgItems=e,X.slashMenuOpen=!0,X.slashMenuIndex=0,X.slashMenuItems=[],t();return}}X.slashMenuOpen=!1,xC(),t();return}let r=e.match(/^\\/(\\S*)$/);if(r){let e=JS(r[1]);X.slashMenuItems=e,X.slashMenuOpen=e.length>0,X.slashMenuIndex=0,X.slashMenuMode=`command`,X.slashMenuCommand=null,X.slashMenuArgItems=[]}else X.slashMenuOpen=!1,xC();t()}function CC(e,t,n){if(e.argOptions?.length){t.onDraftChange(`/${e.name} `),X.slashMenuMode=`args`,X.slashMenuCommand=e,X.slashMenuArgItems=e.argOptions,X.slashMenuOpen=!0,X.slashMenuIndex=0,X.slashMenuItems=[],n();return}X.slashMenuOpen=!1,xC(),e.executeLocal&&!e.args?(t.onDraftChange(`/${e.name}`),n(),t.onSend()):(t.onDraftChange(`/${e.name} `),n())}" +
    "BBB" +
    "case`Tab`:n.preventDefault(),wC(X.slashMenuItems[X.slashMenuIndex],e,g);return;case`Enter`:n.preventDefault(),CC(X.slashMenuItems[X.slashMenuIndex],e,g);return;case`Escape`:n.preventDefault(),X.slashMenuOpen=!1,xC(),g();return" +
    "CCC";

  const patched = patchSlashEnterSource(sample);

  assert.equal(patched.changed, true);
  assert.match(patched.source, /function OCX\(e,t\)/);
  assert.match(patched.source, /CC\(X\.slashMenuItems\[X\.slashMenuIndex\],e,g,!0\)/);
});

test("patchSlashEnterSource supports the current upstream slash-menu signatures", () => {
  const sample =
    "AAA" +
    "function jC(){X.slashMenuMode=`command`,X.slashMenuCommand=null,X.slashMenuArgItems=[],X.slashMenuItems=[]}function MC(e,t){let n=e.match(/^\\/(\\S+)\\s(.*)$/);if(n){let e=n[1].toLowerCase(),r=n[2].toLowerCase(),i=tC.find(t=>t.name===e);if(i?.argOptions?.length){let e=r?i.argOptions.filter(e=>e.toLowerCase().startsWith(r)):i.argOptions;if(e.length>0){X.slashMenuMode=`args`,X.slashMenuCommand=i,X.slashMenuArgItems=e,X.slashMenuOpen=!0,X.slashMenuIndex=0,X.slashMenuItems=[],t();return}}X.slashMenuOpen=!1,jC(),t();return}let r=e.match(/^\\/(\\S*)$/);if(r){let e=iC(r[1]);X.slashMenuItems=e,X.slashMenuOpen=e.length>0,X.slashMenuIndex=0,X.slashMenuMode=`command`,X.slashMenuCommand=null,X.slashMenuArgItems=[]}else X.slashMenuOpen=!1,jC();t()}function NC(e,t,n){if(e.argOptions?.length){t.onDraftChange(`/${e.name} `),X.slashMenuMode=`args`,X.slashMenuCommand=e,X.slashMenuArgItems=e.argOptions,X.slashMenuOpen=!0,X.slashMenuIndex=0,X.slashMenuItems=[],n();return}X.slashMenuOpen=!1,jC(),e.executeLocal&&!e.args?(t.onDraftChange(`/${e.name}`),n(),t.onSend()):(t.onDraftChange(`/${e.name} `),n())}function PC(e,t,n){if(e.argOptions?.length){t.onDraftChange(`/${e.name} `),X.slashMenuMode=`args`,X.slashMenuCommand=e,X.slashMenuArgItems=e.argOptions,X.slashMenuOpen=!0,X.slashMenuIndex=0,X.slashMenuItems=[],n();return}X.slashMenuOpen=!1,jC(),t.onDraftChange(e.args?`/${e.name} `:`/${e.name}`),n()}function FC(e,t,n,r){let i=X.slashMenuCommand?.name??``;X.slashMenuOpen=!1,jC(),t.onDraftChange(`/${i} ${e}`),n(),r&&t.onSend()}" +
    "BBB" +
    "case`Tab`:n.preventDefault(),PC(X.slashMenuItems[X.slashMenuIndex],e,g);return;case`Enter`:n.preventDefault(),NC(X.slashMenuItems[X.slashMenuIndex],e,g);return;case`Escape`:n.preventDefault(),X.slashMenuOpen=!1,jC(),g();return" +
    "CCC";

  const patched = patchSlashEnterSource(sample);

  assert.equal(patched.changed, true);
  assert.match(patched.source, /function OCX\(e,t\)/);
  assert.match(patched.source, /NC\(X\.slashMenuItems\[X\.slashMenuIndex\],e,g,!0\)/);
});

test("patchCompactCommandSource routes /compact through chat.send semantics", () => {
  const sample =
    "AAA" +
    "async function Fw(e,t){try{return await e.request(`sessions.compact`,{key:t}),{content:`Context compacted successfully.`,action:`refresh`}}catch(e){return{content:`Compaction failed: ${String(e)}`}}}" +
    "BBB" +
    "case`compact`:return await Fw(e,t);" +
    "CCC";

  const patched = patchCompactCommandSource(sample);

  assert.equal(patched.changed, true);
  assert.match(patched.source, /e\.request\(`chat\.send`/);
  assert.match(patched.source, /message:r\?`\/compact \$\{r\}`:`\/compact`/);
  assert.match(patched.source, /case`compact`:return await Fw\(e,t,r\);/);
});

test("patchCompactCommandSource supports the current upstream compact signatures", () => {
  const sample =
    "AAA" +
    "async function Yw(e,t){try{return await e.request(`sessions.compact`,{key:t}),{content:`Context compacted successfully.`,action:`refresh`}}catch(e){return{content:`Compaction failed: ${String(e)}`}}}" +
    "BBB" +
    "case`compact`:return await Yw(e,t);" +
    "CCC";

  const patched = patchCompactCommandSource(sample);

  assert.equal(patched.changed, true);
  assert.match(patched.source, /e\.request\(`chat\.send`/);
  assert.match(patched.source, /case`compact`:return await Yw\(e,t,r\);/);
  assert.match(patched.source, /Compacting session\.\.\./);
});

test("patchHtmlCacheBust preserves stable hashed asset URLs without query tokens", () => {
  const sample = `
    <script type="module" src="./assets/index-ABC.js?v=token123"></script>
    <link rel="stylesheet" href="./assets/index-XYZ.css?v=token123">
  `;

  const patched = patchHtmlCacheBust(sample, "token123");

  assert.equal(patched.changed, true);
  assert.match(patched.html, /\.\/assets\/index-ABC\.js"/);
  assert.match(patched.html, /\.\/assets\/index-XYZ\.css"/);
  assert.doesNotMatch(patched.html, /\?v=token123/);
});
