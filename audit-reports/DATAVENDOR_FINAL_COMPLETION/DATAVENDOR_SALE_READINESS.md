# DataVendor sale readiness

## Current assessment: not yet ready to submit

The Admin/Doctor clean-room migration materially reduces the former template and vendor-bundle risk. However, a commercially reviewable submission still requires resolution of the retained GPL address dependency, patient/legacy image provenance, and historical source-package handling.

## Minimum clean export rules

Include current source, tests, package manifests/lockfiles, documentation, and only verified third-party notices. Exclude `.env`, `node_modules`, logs, invoices, uploads, real records, legacy template files, and the `.git` directory/history. A source-only export must clearly state that it does not contain original history because that history includes prior restricted material.

## Secret review

The current tracked tree had no high-confidence secret pattern match. Historical candidate matches were Razorpay key identifiers in retired patient appointment files, not evidence of a secret value. Review and rotate the associated Razorpay project if it is still controlled or possibly live. Never include `.env` in the artifact.
