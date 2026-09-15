## 2025-05-18 - Concurrent Upstash Redis REST requests for independent keys
**Learning:** Sequential HTTP REST requests to Upstash Redis for independent keys (`murex:catalog` and `murex:offset`) double network latency per catalog operation. Executing them concurrently via `Promise.all` cuts network round-trip overhead by ~50% without requiring SDK dependencies or pipeline endpoint changes.
**Action:** Always audit database REST operations for independent key queries and issue them in parallel using `Promise.all`.
