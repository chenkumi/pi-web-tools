# Implementation review and verification summary

Read-only independent review covered config/native OpenAI/REST search/output/pi glue. Parent inspected all delegated fetch source and tests before final verification.

Confirmed/fixed:
1. pi 0.85.1 swallows before_provider_request handler exceptions. Native injection errors now explicitly call ctx.abort; guidance is not added when an active local web_search conflicts. Regression covers error-swallowing behavior and preserved payload.
2. pi-ai 0.85.1 Responses decoder drops hosted source objects and URL annotations. README documents this known limitation; guidance requests explicit Markdown source links. Synthetic stream compatibility test confirms annotation-only URL loss and explicit URL retention. No claim of full source preservation.
3. Present malformed Brave web sections were mistaken for absent/empty results; now rejected with regression cases.
4. Playwright context.close called from abort and finally raced: second call returned while first still closing. Both now share one close promise. Real browser cancellation/deadline/isolation/idle/shutdown assertions pass.
5. Internal search errors use a private class, not string prefixes accepted from arbitrary transport exceptions; upstream body/headers are not exposed.

Final verification attempt 5:
- TypeScript strict check PASS.
- 32 unit tests PASS; no skipped tests.
- 12 integration tests reported PASS (includes nested Chromium cases and real isolated pi loader).
- npm pack --dry-run PASS, 15 runtime/docs/schema files, 22.0 kB packed.
- Actual tarball production-only installation in temporary directory PASS; real pi loader + lazy fetch import/private-address rejection PASS; installation removed after verification.
- npm install audit: 0 vulnerabilities at installation time.

Not verified: live OpenAI/Azure/Codex hosted-search backend acceptance and account billing; live Brave/Exa authentication/API behavior. No real credentials were read or written by the implementation session. Browser fixtures use loopback only through test-only constructor allowance. No global pi install or settings/auth mutation performed.

Known limitations: browser/route.fetch buffering is not a hard RSS/network-byte cap; DNS validation is not a rebinding-proof egress sandbox; redirected subresource relative URL semantics may differ; extraction is heuristic and native citations need upstream support. Details in README.
