# Feature parity verification

| Workflow | Contract verified | Runtime status |
| --- | --- | --- |
| Admin login | POST target, email/password names, EJS error/repopulation | Rendered; successful authentication requires isolated DB test |
| Doctor login | POST target, email/password names, EJS error/repopulation | Rendered; successful authentication requires isolated DB test |
| Doctor registration | Multipart action and all original field names | Rendered contract test |
| Doctor directory/removal | `/clear/:id` form retained | Static/rendered; destructive action not submitted |
| Support triage | status/priority/assignee/reply names and thread action retained | Rendered contract test |
| Appointment status | Admin/Doctor POST fetch retained | Template/static only; requires role-specific staging session |
| Doctor search/sort/pagination | Local script replaces DataTables | Rendered contract test; browser interaction pending staging |
| Availability calendar | slot preview, save, exception and booking toggle endpoints retained | Rendered contract test; API session pending staging |
| Video requests | accept/decline and join/calendar links retained | Template/static only; external interaction intentionally not invoked |

No test result above implies a live provider or production-database operation. The staging checklist in `docs/DEPLOYMENT.md` is required before release approval.
