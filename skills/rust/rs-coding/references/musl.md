# Static musl binaries

Linux binaries ship for `x86_64-unknown-linux-musl` and `aarch64-unknown-linux-musl`: one static file, no glibc version to match, no NSS or `dlopen` surface. Development and tools stay on the host target; CI also runs the suite in the musl container of each shipped target.

## Targets

- rustc links musl's self-contained C runtime; no musl toolchain is installed.
- x86_64 links static PIE by default.
- aarch64 links `-static -no-pie` by default (rustc's target spec). The [`assets`](../assets/) make it static PIE: `lld-cc` swaps in `rcrt1.o`, `crtbeginS.o`, `crtendS.o`, and `-static-pie`, and the config builds with `-C relocation-model=pic`.
- Both need the [`release.md`](release.md#linker) linker setup.

## Build

Build natively in `rust:<channel>-alpine` of the host's architecture; a container cannot run another architecture's binaries without emulation, and the tests must run. `cross` and `cargo-zigbuild` are not used: the native container is the whole toolchain.

```sh
channel="$(sed -n 's/^channel = "\(.*\)"$/\1/p' rust-toolchain.toml)"
docker run --rm -v "$PWD:/src:ro" -w /src \
  -v cargo-registry:/usr/local/cargo/registry -v target-musl:/target \
  -e CARGO_TARGET_DIR=/target -e RUSTUP_TOOLCHAIN="$channel" \
  "rust:$channel-alpine" \
  sh -c 'apk add --quiet --no-cache git lld && git config --global --add safe.directory /src &&
    export CARGO_BUILD_TARGET="$(uname -m)-unknown-linux-musl" && exec cargo "$@"' \
  cargo test --workspace --all-features
```

The target comes from `uname -m` inside the container: a macOS host says `arm64`, which is no Rust target.

- `lld`: Alpine's own; `lld-cc` uses it there because Rust's bundled lld cannot read Alpine's zlib-compressed `crt*.o` debug sections. The image already ships `gcc`.
- Volumes keep the registry and the build between runs; `/src` is read-only, so nothing lands in the working tree.
- The release build is the same container with `-e SOURCE_DATE_EPOCH` passed through, `cargo install --locked cargo-auditable` added to the setup (the image lacks it), then `cargo auditable build --release --locked --features mimalloc` ([`release.md`](release.md#reproducible-and-auditable-builds)).

## Behaviour gaps

- No NSS: `getpwnam` and friends read only `/etc/passwd` and `/etc/group`, never LDAP or systemd-homed.
- musl's DNS resolver queries every `nameserver` in parallel and takes the first answer, and reads only `nameserver`, `search`/`domain`, and the `ndots`, `timeout`, `attempts` options from `resolv.conf`. Services that resolve names are tested against the deployment's resolver setup.
- No `dlopen` of shared libraries in a static binary.
- musl's allocator is slow under contention: ship mimalloc ([`release.md`](release.md#allocator)).

**Check:** the suite passes in the container for each shipped target, then [`release.md`](release.md#verify).
