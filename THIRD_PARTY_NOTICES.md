# Third-party material status

This file is an engineering inventory, not legal advice and not a project license.

## Removed from the Admin/Doctor source tree

- BootstrapMade/NiceAdmin-derived dashboard markup, CSS, JavaScript, and bundle structure were replaced with independently authored templates and `frontend/shared/assets`.
- TinyMCE 7.2.1, Quill, Simple-DataTables, Bootstrap, Bootstrap Icons, Boxicons, Remix Icon, and the Doctor DataTables CDN use were removed with the old dashboard vendor directories after an active-reference scan.

TinyMCE 7 is GPL-2.0-or-later; the project no longer distributes its copied bundle. Simple-DataTables is LGPL according to its upstream package page; the unversioned copied bundle is no longer distributed. BootstrapMade’s own terms prohibit reselling or mass redistribution of template material, so prior historical copies remain excluded from any sale artifact.

## Address data component

The GPL-3.0 `country-state-city` package was removed. The same three public routes now use the offline `@countrystatecity/countries` 2.0.0 package. Its npm metadata and upstream repository declare the geographic dataset under ODbL-1.0.

- Use: country, state, and city lookup only; no patient information is supplied to the package or a remote service.
- Data attribution: `Data by Countries States Cities Database — https://github.com/dr5hn/countries-states-cities-database — ODbL v1.0`.
- Package attribution requested by the shipped LICENSE: `@countrystatecity/countries — https://github.com/dr5hn/countrystatecity`. Its package.json repository is `https://github.com/dr5hn/countrystatecity-npm`; preserve both references pending upstream clarification.
- License references: [ODbL 1.0 legal text](https://opendatacommons.org/licenses/odbl/1-0/) and [Database Contents License](https://opendatacommons.org/licenses/dbcl/1-0/). Preserve upstream notices and include the license or its URI in data and relevant documentation. Public output also requires appropriate attribution; a private source notice alone does not establish compliance for public APIs.
- Important: ODbL allows commercial use, modification, and redistribution, but it requires attribution and may require share-alike/open-database obligations when a public derivative database is distributed. It is not a permissive-code license. Keep this notice and obtain legal review before commercial distribution of a package that includes the data.
- The OneLife application code and this geographic dataset must remain separately identified in any DataVendor export. No legal clearance is asserted here.
- The package's LICENSE describes the package and data together as ODbL, while ODbL section 2.3(a) excludes computer programs from its scope. A separate, adequate license/permission for the package's executable code has not been verified. Owner/counsel must resolve this and DataVendor's AI-training/sublicensing terms before calling the replacement legally cleared. ODbL section 4.8 does not allow sublicensing the database as proprietary OneLife material.

## Asset provenance

The replacement consoles do not reference old dashboard logos, profile images, or template graphics. The actively referenced patient-facing visual set now uses original SVG marks (`onelife-mark.svg`, `onelife-avatar.svg`) and two newly generated OneLife images (`onelife-team-generated.png`, `onelife-clinician-generated.png`). These generated images were created in this development pass without input images, logos, or borrowed brand material; this is provenance evidence, not a legal ownership opinion.

Existing patient assets and legacy Admin/Doctor image files are not asserted to be original. Timestamped image names are consistent with application uploads, but that is not proof of rights. Some of them may be persisted clinician uploads referenced by live database records through `backend/services/doctor-image.js`; exclude these files and any database uploads from a DataVendor export unless the owner supplies rights evidence, and do not delete them from an active deployment without a migration plan.
