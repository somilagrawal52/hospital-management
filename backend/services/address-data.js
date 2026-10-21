// Independently authored compatibility projections. Geographic records remain
// under the replacement dataset's ODbL terms; no legacy library/data is copied.
const data = require("@countrystatecity/countries");
const string = value => value == null ? "" : String(value);
const byName = (a, b) => a.name === b.name ? 0 : a.name < b.name ? -1 : 1;
const legacyState = (country, code) => country === "IN" && code === "UK" ? "UT" : code;
const sourceState = (country, code) => country === "IN" && code === "UT" ? "UK" : code;
let countriesPromise;

async function countries() {
  if (!countriesPromise) countriesPromise = (async () => {
    const rows = await data.getCountries();
    return Promise.all(rows.map(async row => {
      const meta = await data.getCountryByCode(row.iso2);
      return { name: row.name, isoCode: row.iso2, flag: row.emoji, phonecode: string(row.phonecode), currency: string(row.currency), latitude: string(row.latitude), longitude: string(row.longitude), timezones: (meta?.timezones || []).map(zone => ({ zoneName: zone.zoneName, gmtOffset: zone.gmtOffset, gmtOffsetName: zone.gmtOffsetName, abbreviation: zone.abbreviation, tzName: zone.tzName })) };
    }));
  })().then(rows => rows.sort(byName)).catch(error => { countriesPromise = null; throw error; });
  return countriesPromise;
}

async function states(countryCode) {
  return (await data.getStatesOfCountry(countryCode)).map(row => ({ name: row.name, isoCode: legacyState(countryCode, row.iso2), countryCode: row.country_code, latitude: string(row.latitude), longitude: string(row.longitude) })).sort(byName);
}

async function cities(countryCode, stateCode) {
  return (await data.getCitiesOfState(countryCode, sourceState(countryCode, stateCode))).map(row => ({ name: row.name, countryCode: row.country_code, stateCode: legacyState(countryCode, row.state_code), latitude: string(row.latitude), longitude: string(row.longitude) })).sort(byName);
}

module.exports = { countries, states, cities };
