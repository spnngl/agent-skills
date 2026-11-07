# Binaries and services

What a binary does at runtime. How it is built and shipped: [`release.md`](release.md).

## `main`

`main` parses arguments, sets up logging and the runtime, calls `run`, and maps the outcome to an exit code. Logic lives in the library crate ([`cargo.md`](cargo.md#layout-and-build-scripts)).

```rust
use std::process::ExitCode;

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(err) => {
            // Rust ignores SIGPIPE, so `app | head` surfaces as an error: exit quietly, as C tools do.
            let broken_pipe = err.chain().any(|cause| {
                cause
                    .downcast_ref::<std::io::Error>()
                    .is_some_and(|e| e.kind() == std::io::ErrorKind::BrokenPipe)
            });
            if broken_pipe {
                return ExitCode::SUCCESS;
            }
            eprintln!("error: {err:#}");
            ExitCode::from(2)
        }
    }
}

fn run() -> anyhow::Result<()> {
    // ...
    Ok(())
}
```

- Write output with `writeln!(out, ...)?` on a locked, buffered `stdout`: `print!` / `println!` panic on a broken pipe instead of returning the error.
- Print the error once, at the top, with `{:#}` (one line, causes joined by `: `) or `{:?}` (one cause per line).
- Document the exit codes; reserve distinct ones only for outcomes scripts branch on (ripgrep: 0 match, 1 no match, 2 error).

## Errors

- `anyhow::Result` everywhere in the binary; `color-eyre` when users read the reports.
- Add `.context("loading config")` or `.with_context(|| format!("reading {}", path.display()))` at each layer that adds meaning; `anyhow::bail!` and `anyhow::ensure!` for early exits.
- Each error is either handled, or returned with context; never logged and then returned, so it surfaces once.

## CLI

- `clap` with derive. `lexopt` when dependencies and compile time matter more than generated help (ripgrep).
- Every option is also documented in `--help`; environment variables and config files layer below flags.
- Output for machines (`--json`, stable columns) is a separate mode from output for humans; colour only when `std::io::IsTerminal` says stdout is a terminal and `NO_COLOR` is unset.

## Logging

- Libraries emit `tracing` events and spans and never print or install a subscriber; the binary installs one (`tracing-subscriber` with `EnvFilter`).
- Events carry structured fields with a constant message: `info!(path = %path.display(), bytes, "config loaded")`, not `info!("loaded {} ({} bytes)", ...)`. Constant messages group and search.
- Secrets never reach a field: log an ID or a redacted form ([`traits.md`](traits.md#hand-written-impls)).

## Panic isolation

A service catches panics only at an isolation boundary, one request or task, so one bug does not take down the rest: `tokio` already turns a task panic into a `JoinError`; synchronous workers use `std::panic::catch_unwind`. Log the panic, fail that unit, keep serving. Catching needs unwinding, so a binary relying on it keeps the default `panic = "unwind"` ([`release.md`](release.md#profiles)). State shared with the panicking unit may be half-updated: a poisoned `Mutex` says so.
