const fs = require("fs");
const path = require("path");

const {
  patchControlUiRoot,
  resolveInstalledControlUiRoot,
  resolveWorkspaceLocalControlUiRoot,
} = require("./control_ui_patch_utils.cjs");

function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const sourceRoot = resolveInstalledControlUiRoot();
  const destRoot = process.argv[2]
    ? path.resolve(process.argv[2])
    : resolveWorkspaceLocalControlUiRoot(repoRoot);

  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Installed Control UI root not found: ${sourceRoot}`);
  }

  fs.rmSync(destRoot, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destRoot), { recursive: true });
  fs.cpSync(sourceRoot, destRoot, { recursive: true });

  const result = patchControlUiRoot(destRoot, {
    patchSlashEnter: true,
    patchCompactCommand: true,
  });

  console.log(
    JSON.stringify(
      {
        sourceRoot,
        destRoot,
        changed: result.changed,
        operations: result.operations,
      },
      null,
      2,
    ),
  );
}

main();
