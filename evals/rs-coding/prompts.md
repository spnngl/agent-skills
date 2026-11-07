# Prompts

Each run gets the preamble, with `<skill>` and `<dir>` filled in, followed by one task.

## Preamble

> You are a Rust developer. A Rust coding skill is at `<skill>/SKILL.md`. Read it FIRST and follow its workflow, loading its reference files as it directs. Do not read anything outside your working directory except the skill.
>
> Working directory: `<dir>` (work only here). Network access to crates.io works.
>
> When done, reply with: files changed, commands you ran and their results, and which skill reference files you read.

## Tasks

**p1.** Add a config-loading module to this library crate (`confy`). It loads a TOML file with fields `listen_port` (1..=65535), `data_dir` (a directory path), and optional `log_level` (one of error/warn/info/debug). Expose a public function to load it from a path.

**p2.** Write a CLI in this directory (new binary crate `treegrep`) that recursively searches a file tree for lines matching a regex and prints `path:line:text`. Exit codes like grep.

**p3.** Wrap this C function for Rust: `int parse(const char*, size_t, kv_out*)`. Header and implementation are in `csrc/`. Create a crate in this directory exposing a safe Rust API; compile the C code with the crate.

**p4.** Add a tokio worker pool with graceful shutdown to this library crate (`pool`): submit async jobs, N workers process them, shutdown stops accepting jobs, drains or cancels in-flight ones within a deadline, and reports how it ended.

**p5.** Review this diff (`git diff` in this repository: uncommitted changes against HEAD). Do not modify files; write your review to REVIEW.md.

**p6.** Set up release builds for this CLI (`hello`) on Linux and macOS: everything needed in the repository (config files, build recipe or script, docs in RELEASE.md) so a maintainer can produce the shipped binaries. Do not run container builds; local cargo builds are fine.
