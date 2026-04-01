const fs = require("fs");
const path = require("path");

const targetPath = path.join(
  process.env.APPDATA || "",
  "npm",
  "node_modules",
  "openclaw",
  "dist",
  "gateway-2B_mHKFr.js",
);

const before = 'const URGENT_COMMANDS = ["/stop"];';
const after = 'const URGENT_COMMANDS = ["/stop", "/compact"];';

function main() {
  if (!fs.existsSync(targetPath)) {
    console.error(`QQ gateway runtime not found: ${targetPath}`);
    process.exit(1);
  }
  const source = fs.readFileSync(targetPath, "utf8");
  if (source.includes(after)) {
    console.log("QQ compact urgent patch already applied.");
    return;
  }
  if (!source.includes(before)) {
    console.error("Expected QQ urgent command signature not found. Bundle may have changed.");
    process.exit(1);
  }
  fs.writeFileSync(targetPath, source.replace(before, after), "utf8");
  console.log(`Patched QQ urgent command list: ${targetPath}`);
}

main();
