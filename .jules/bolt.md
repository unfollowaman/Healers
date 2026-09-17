## 2025-05-19 - DocumentFragment batching for vanilla DOM list rendering
**Learning:** Appending list items sequentially directly to live DOM container elements causes N layout reflows/repaints per render. Accumulating items into a lightweight `DocumentFragment` first and performing a single append reduces DOM updates to 1.
**Action:** Always wrap iterated DOM creation and insertion loops in a `DocumentFragment` before attaching to the target container.

## 2025-05-18 - Concurrent Upstash Redis REST requests for independent keys
**Learning:** Sequential HTTP REST requests to Upstash Redis for independent keys (`murex:catalog` and `murex:offset`) double network latency per catalog operation. Executing them concurrently via `Promise.all` cuts network round-trip overhead by ~50% without requiring SDK dependencies or pipeline endpoint changes.
**Action:** Always audit database REST operations for independent key queries and issue them in parallel using `Promise.all`.
