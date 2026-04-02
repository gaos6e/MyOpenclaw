const path = require("path");

const {
  patchControlUiRoot,
  resolveInstalledControlUiRoot,
} = require("./control_ui_patch_utils.cjs");

function main() {
  const root = process.argv[2]
    ? path.resolve(process.argv[2])
    : resolveInstalledControlUiRoot();
  const result = patchControlUiRoot(root, {
    patchSlashEnter: false,
    patchCompactCommand: true,
  });
  console.log(
    result.changed
      ? `Patched Control UI compact command behavior in ${result.root}`
      : "Control UI compact-command patch already applied.",
  );
}

main();
