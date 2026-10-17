# Testing

## Layout

- Integration tests in `tests/*.rs` use only the public API; shared helpers go in `tests/common/mod.rs`.
- Doctests using `?` need a hidden `main` returning `Result`:
  ```rust
  /// ```
  /// # fn main() -> Result<(), Box<dyn std::error::Error>> {
  /// let port: my_crate::Port = "8080".parse()?;
  /// # Ok(())
  /// # }
  /// ```
  ```

## Writing tests

- Name each test after the behaviour it pins: `rejects_port_zero`, `retries_after_timeout`.
- Assert on values: `assert_eq!(got, expected)` prints both sides; `assert!(matches!(err, ConfigError::InvalidPort(0)))` checks variants; `#[should_panic(expected = "substring")]` pins panic messages.
- Filesystem work happens in `tempfile::TempDir`, outside the source tree.
- I/O boundaries become traits with a hand-written fake in tests; reach for `mockall` when the fake grows large.

## Tools

| Need | Tool |
| --- | --- |
| Invariants over many inputs (round trips, parse then print) | `proptest` |
| Large or structured output | `insta` snapshots; inspect every change with `cargo insta review` |
| Table-driven cases and fixtures | `rstest` |
| CLI end to end | `assert_cmd`, `predicates` |
| HTTP mocking | `wiremock` |
| Lock-free and concurrent code | `loom` |
| Async | `#[tokio::test]` (see [`async.md`](async.md#tests)) |
| Benchmarks | `criterion` or `divan` in `benches/`, with `harness = false` in `[[bench]]` |
| Coverage | `cargo llvm-cov` |
| Faster runner | `cargo nextest run` |
