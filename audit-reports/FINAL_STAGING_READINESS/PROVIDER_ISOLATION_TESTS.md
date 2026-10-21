# Provider isolation

Use `NODE_ENV=production`, `APP_ENV=staging`, explicit `INTEGRATION_MODE=mock` or `disabled`. Staging without an explicit isolated mode fails validation; configured real Razorpay/Twilio/AI/mail credentials fail validation. Genuine production defaults live and refuses isolated modes. Production NODE_ENV with development/test APP_ENV is rejected. Existing production with new variables absent retains live behavior.

| Integration | mock | disabled |
| --- | --- | --- |
| Payment | Local order IDs, local confirmation UI, process-private HMAC, normal DB/invoice flow; no Razorpay script/client call | Safe 503 payment boundary; mock checkout endpoint 404 |
| Email / WhatsApp | Non-delivering marker, no client/transport constructed | Explicit integration-disabled error before SDK construction |
| AI / WHO lookup | Explicit static simulation; emergency/unrelated-query filtering retained | HTTP 503, no provider request |
| Video | Local simulated join page, calendar and normal approval state | HTTP 503 before meeting creation/join |
| Webhook | Synthetic raw-body HMAC; optional independent MOCK_WEBHOOK_SECRET | No configured verification secret; fails closed |

Unit tests instrument mail transport, HTTPS and sockets and confirm zero attempts for mock/disabled boundaries. Real-Mongo browser harness denies non-loopback sockets and external browser resources and records zero outbound attempts. It exercises mock payment through confirmation/invoice, notifications invoked by the workflows, AI/WHO simulation, video acceptance/join/calendar, and disabled AI/WHO/payment/video HTTP responses. These are tests of local simulations, not assertions about live integrations or actual medical AI quality.

Isolated mode applies self-only script/connect/image CSP and no frames. The payment template loads the local checkout shim instead of Razorpay. Mock endpoints remain authenticated and CSRF-protected and return 404 outside mock mode. No credentials or production accounts were accessed. No actual payment, email, WhatsApp, AI, WHO lookup or video service was used.

This is an application integration boundary, not a system-wide firewall against future code. DB traffic is intentional and must target separately provisioned staging MongoDB. Use only synthetic records, no production environment groups or credentials. Mock payment keys are process-local and pending mock orders may need recreating after a process restart. Production-mode live provider behavior was preserved by code review, not exercised remotely.
