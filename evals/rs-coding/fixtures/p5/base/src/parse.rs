//! Duration parsing.

use std::time::Duration;

/// Parses `"<n>s"` or `"<n>ms"` into a [`Duration`].
///
/// Returns `None` for any other form.
#[must_use]
pub fn duration(s: &str) -> Option<Duration> {
    if let Some(ms) = s.strip_suffix("ms") {
        return ms.parse().ok().map(Duration::from_millis);
    }
    s.strip_suffix('s')?.parse().ok().map(Duration::from_secs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_both_units() {
        assert_eq!(duration("3s"), Some(Duration::from_secs(3)));
        assert_eq!(duration("250ms"), Some(Duration::from_millis(250)));
        assert_eq!(duration("3m"), None);
    }
}
