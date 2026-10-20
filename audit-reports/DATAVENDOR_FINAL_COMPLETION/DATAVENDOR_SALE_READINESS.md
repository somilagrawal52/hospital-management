# DataVendor sale readiness

## Current assessment: not yet ready to submit

The Admin/Doctor clean-room migration and removal of the GPL address package materially reduce the former template and vendor-bundle risk. The address data remains a separately licensed ODbL component, and patient/legacy image provenance and historical source-package handling remain unresolved.

## Minimum clean export rules

Include current source, tests, package manifests/lockfiles, documentation, the ODbL attribution notice, and only assets with an identified provenance status. Exclude `.env`, `node_modules`, logs, invoices, uploads, real records, legacy template files, unverified legacy images, and the `.git` directory/history. A source-only export must clearly state that it does not contain original history because that history includes prior restricted material.

## Secret review

The current tracked tree had no high-confidence secret pattern match. Historical candidate matches were Razorpay key identifiers in retired patient appointment files, not evidence of a secret value. Review and rotate the associated Razorpay project if it is still controlled or possibly live. Never include `.env` in the artifact.
