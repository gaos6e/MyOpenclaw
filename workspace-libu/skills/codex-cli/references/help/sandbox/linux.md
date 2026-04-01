# `codex sandbox linux`

Detected from local binary: `codex-cli 0.118.0-alpha.2`

```text
Run a command under the Linux sandbox (bubblewrap by default)

Usage: codex sandbox linux [OPTIONS] [COMMAND]...

Arguments:
  [COMMAND]...
          Full command args to run under the Linux sandbox

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

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

  -h, --help
          Print help (see a summary with '-h')
```
