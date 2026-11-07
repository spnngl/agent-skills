//! Service endpoints.

use std::time::Duration;

use url::Url;

/// Timeout used when a spec gives none.
pub const DEFAULT_TIMEOUT: Duration = Duration::from_secs(10);

/// A service URL with its request timeout.
#[derive(Debug, Clone)]
pub struct Endpoint {
    /// Where to send requests.
    pub url: Url,
    /// How long one request may take.
    pub timeout: Duration,
}

impl Endpoint {
    /// Builds an endpoint from `"<url>"` or `"<url> <timeout>"`, e.g. `"https://a.example 3s"`.
    pub fn from_spec(spec: &str) -> Self {
        let mut parts = spec.split_whitespace();
        let url = Url::parse(parts.next().unwrap()).unwrap();
        let timeout = match parts.next() {
            Some(t) => crate::parse::duration(t).unwrap(),
            None => DEFAULT_TIMEOUT,
        };
        Self { url, timeout }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_timeout_is_ten_seconds() {
        assert_eq!(DEFAULT_TIMEOUT, Duration::from_secs(10));
    }

    #[test]
    fn parses_url_and_timeout() {
        let e = Endpoint::from_spec("https://a.example 3s");
        assert_eq!(e.url.host_str(), Some("a.example"));
        assert_eq!(e.timeout, Duration::from_secs(3));
    }
}
