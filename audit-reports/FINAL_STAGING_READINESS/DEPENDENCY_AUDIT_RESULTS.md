# Dependency audit results — 21 October 2026

Commands executed against the npm registry; no application/provider accounts were contacted:

| Command | Result |
| --- | --- |
| `npm --prefix backend audit --omit=dev` | 0 vulnerabilities |
| `npm --prefix backend audit` | 0 vulnerabilities |
| `npm --prefix frontend/patient audit --omit=dev` | 0 vulnerabilities |
| `npm --prefix frontend/patient audit` | 7 findings: 5 high, 2 moderate, 0 critical |

Backend follow-redirects changed 1.16.0 → 1.16.1 within the installed Razorpay/axios-compatible chain. Development nodemon → chokidar → braces was removed; `npm run dev` now uses `node --watch index.js`. A dedicated test confirms restart after an imported module changes. Production `npm start` remains unchanged.

Compatible `npm update` in the frontend reduced 14 findings (12 high, 2 moderate) to seven and updated Tailwind within its existing major to 3.4.19. Neither `audit fix --force` nor a Tailwind 4 migration was used.

## Unresolved build-tool chain

Tailwind 3.4.19 → chokidar 3.6.0 / fast-glob 3.3.3 / micromatch 4.0.8 → braces 3.0.3 remains affected by nesting-related denial of service (GHSA-vfj7-8cjw-p6xm). The selector-parser chain (including postcss-nested) retains a moderate complexity finding. npm counts propagated parent advisories as well as leaf packages; seven does not mean seven independent exploit primitives.

The registry currently recommends a breaking Tailwind 4.3.3 upgrade for this chain. No compatible patched braces release was identified by npm audit. Do not apply an untested override of incompatible selector-parser or migrate Tailwind's configuration/CLI solely to suppress counts. The CSS compiler consumes trusted repository templates in a one-shot build; it is not a public runtime endpoint. Keep untrusted templates/globs out of builds. Frontend dev tools are nonetheless installed on Render during the required build, so this is a real, documented build-time residual risk, not a claim of zero vulnerabilities.

Owner should accept this scoped staging exception or commission a separately tested build-tool migration before demanding a clean all-dependency audit. Backend production audit clearance is not general application security or licensing clearance. Re-run audits at deployment/export because advisories change. npm emitted deprecation warnings and stale Browserslist data; deterministic CSS output was still verified.
