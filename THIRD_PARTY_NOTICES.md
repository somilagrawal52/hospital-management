# Third-party material status

This file is an engineering inventory, not legal advice and not a project license.

## Removed from the Admin/Doctor source tree

- BootstrapMade/NiceAdmin-derived dashboard markup, CSS, JavaScript, and bundle structure were replaced with independently authored templates and `frontend/shared/assets`.
- TinyMCE 7.2.1, Quill, Simple-DataTables, Bootstrap, Bootstrap Icons, Boxicons, Remix Icon, and the Doctor DataTables CDN use were removed with the old dashboard vendor directories after an active-reference scan.

TinyMCE 7 is GPL-2.0-or-later; the project no longer distributes its copied bundle. Simple-DataTables is LGPL according to its upstream package page; the unversioned copied bundle is no longer distributed. BootstrapMade’s own terms prohibit reselling or mass redistribution of template material, so prior historical copies remain excluded from any sale artifact.

## Retained decision point

`country-state-city` 3.2.1 is installed and used only by `backend/controller/address.js` for the `/countries`, `/states/:countryCode`, and `/cities/:countryCode/:stateCode` routes. Its installed package declares GPL-3.0. Do not claim a commercial-compatible status for that code/data until qualified counsel selects one of these paths: retain under its terms, replace with a verified-permissive dataset/service while preserving route behavior, or remove the feature with product approval.

## Asset provenance

The replacement consoles do not reference old dashboard logos, profile images, or template graphics. Existing patient assets and legacy Admin/Doctor image files are not asserted to be original. Some Admin image files may be persisted clinician uploads referenced by live database records; exclude them from a DataVendor export unless the owner supplies rights evidence, and do not delete them from an active deployment without a migration plan.
