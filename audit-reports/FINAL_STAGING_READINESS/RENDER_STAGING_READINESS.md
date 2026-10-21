# Render staging readiness

Verdict: the targeted local technical blockers are fixed and isolated workflows verified. Ready for owner-approved **mock-only staging**, subject to acceptance of the frontend build-tool audit residual and independent Node patch review. Not a production-release approval, legal clearance or DataVendor sale approval. No external operation has been performed.

| Setting | Exact value |
| --- | --- |
| New service | onelife-staging, Node web service |
| Branch | datavendor-improvements only |
| Root Directory | Empty (repository root; sibling frontend is required) |
| Build | `npm --prefix backend ci --omit=dev && (cd frontend/patient && npm ci --include=dev && ./node_modules/.bin/tailwindcss -i index.css -o views/assets/tailwind.css --minify)` |
| Start | `npm --prefix backend start` |
| Health | `/health` (liveness, not DB readiness) |
| Auto-Deploy | Off; account for initial service creation triggering a deploy |
| Runtime | Tested Node 22.17.0; exact pin for reproduction, not a current-patch security endorsement |
| Production service | Leave entirely unchanged, master at 30c4d3e, On Commit |

The build passed in a temporary clean staged-source fixture without .env, copied node_modules or untracked files, with NODE_ENV=production. Backend ci installed 208 packages, frontend ci 72; minified CSS matched the working tree byte hash. This is a local Windows/Git Bash build, not a claim to have executed Render's Linux builder.

## Environment (names only; never reuse production values)

Set `NODE_ENV=production`, `APP_ENV=staging`, `INTEGRATION_MODE=mock`; Render supplies `PORT`. Supply a new restricted `DATABASE_URL`, fresh random `JWT_SECRET` (at least 32 characters), `PUBLIC_BASE_URL` equal to staging HTTPS origin, and chosen/tested `NODE_VERSION`. Optional `MOCK_WEBHOOK_SECRET` must be independently generated. Do not attach environment groups.

Omit `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `mail_user`, `mail_pass` (startup rejects them in staging). Mail settings and video base are unnecessary in mock mode. Local production configuration was not read from Render; privately compare variable names only. Existing lowercase aliases remain accepted, but new staging must use uppercase and avoid conflicting aliases.

Provision a separate MongoDB deployment/database and a database-scoped user; do not restore production data. Verify host AND database, use synthetic reserved addresses/phone placeholders. The guarded model-based five-account recipe and full authenticated acceptance checklist are in `docs/STAGING_VERIFICATION_RUNBOOK.md`. No production migrations are proposed.

## Exact next manual steps

1. Review this change and remaining audit/license limitations; approve the first push and separate staging resources. Record the local reviewed commit SHA and production Render last-successful deploy ID privately. Confirm no production service follows this development branch.
2. After push approval ONLY, run: `git push --set-upstream origin refs/heads/datavendor-improvements:refs/heads/datavendor-improvements`. This explicit refspec does not push master or tags; do not use --all, --mirror, --force or merge.
3. With separate deployment approval, provision isolated database credentials and create/configure only onelife-staging. Inspect the settings before allowing its initial deploy; leave Auto-Deploy Off. No shared production domains, env groups or database.
4. Deploy the reviewed SHA manually. Verify actual Node version/build, /health AND DB-connected login, all three roles, CSRF, forms/uploads, table controls, appointments/payment simulation/status/rescheduling/waitlist/video simulation, address selection and navigation at all widths. Confirm network behavior remains mock-only.
5. Staging acceptance does not authorize production merge, publication, source export or DataVendor upload. Seek separate approvals.

## Rollback

For staging use its last successful retained artifact. On a first deploy with no artifact, suspend only staging. Do not touch production routing. For any separately approved future production release, record the last successful production Render deploy ID/SHA first; roll back that service to the retained artifact if smoke checks fail. Dashboard rollback disables autodeploy, API rollback does not. Database writes and disk contents are not reverted; environment group values are not restored. Do not restore/delete a database automatically. Retention is plan-dependent; absent artifacts require an approved recovery deployment.

Official references checked: [monorepo root behavior](https://render.com/docs/monorepo-support), [health checks](https://render.com/docs/health-checks), [rollback details](https://render.com/docs/rollbacks). No Render account was accessed.
