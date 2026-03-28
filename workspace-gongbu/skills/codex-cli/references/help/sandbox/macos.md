# `codex sandbox macos`

Detected from local binary: `codex-cli 0.116.0`

```text
Run a command under Seatbelt (macOS only)

Usage: codex sandbox macos [OPTIONS] [COMMAND]...

Arguments:
  [COMMAND]...
          Full command args to run under seatbelt

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as TOML. If it fails to parse as TOML, the raw string is used as a literal.
          
          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

      --full-auto
          Convenience alias for low-friction sandboxed automatic execution (network-disabled sandbox
          that can write to cwd and TMPDIR)

      --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`

      --log-denials
          While the command runs, capture macOS sandbox denials via `log stream` and print them
          after exit

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

  -h, --help
          Print help (see a summary with '-h')
```
