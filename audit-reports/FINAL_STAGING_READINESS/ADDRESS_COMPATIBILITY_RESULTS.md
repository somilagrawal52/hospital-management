# Address compatibility results

The endpoints remain `GET /countries`, `/states/:countryCode`, `/cities/:countryCode/:stateCode`. The replacement remains pinned `@countrystatecity/countries@2.0.0`; legacy `country-state-city@3.2.1` is not reintroduced.

| Response | Restored legacy properties |
| --- | --- |
| Country | name, isoCode, flag, phonecode, currency, latitude, longitude, timezones |
| State | name, isoCode, countryCode, latitude, longitude |
| City | name, countryCode, stateCode, latitude, longitude |

Coordinates and phone codes are strings; null coordinates become empty strings. Country timezones restore zoneName, numeric gmtOffset, gmtOffsetName, abbreviation and tzName. Rows use ascending case-sensitive JavaScript name comparison, as the prior library did. Unrecognized/lowercase identifiers return empty arrays as before.

IN Uttarakhand is presented as legacy `UT`; both `/cities/IN/UT` and `/cities/IN/UK` query the replacement's UK data, with legacy UT in responses. No persisted address values are rewritten. Five address tests pass: full country/timezone contracts across IN/US/GB/AU/DE, state/city shapes and sorting including Mumbai/Los Angeles/Sydney, alias equivalence and invalid identifiers. HTTP checks confirm fields, attribution Link and aliases.

## Dataset differences not hidden

Earlier full reference comparison (`../FINAL_VERIFICATION_2026-10-21/address-comparison.json`) found 250 countries in each version, 4,963 versus 5,328 states, and 148,038 versus 152,152 cities. The raw replacement changed 474 old state keys and added 839; old/new city composite keys differ substantially (56,166 absent and 57,211 added), including renaming, administrative boundary and state-code changes. These are raw prior comparison counts, not counts after this adapter. UT compatibility repairs one known case; global historical identifier equivalence is not claimed.

The adapter restores structure and the tested selections, not deleted/renamed geographic records. Existing free-text addresses remain untouched; additional alias mappings require evidence rather than guesses. No legacy geographic records were copied. Replacement data version is `v4.0-export.50-2026.10.12`.

## Rights

API Link headers identify ODbL and upstream data; existing third-party notices remain. Shape projection is original code but the underlying data is not proprietary OneLife material. Header attribution alone is not legal clearance; wrapper-code licensing, public derived outputs, share-alike and training/sublicensing terms still require review. See `REMAINING_DATAVENDOR_ACTIONS.md`.
