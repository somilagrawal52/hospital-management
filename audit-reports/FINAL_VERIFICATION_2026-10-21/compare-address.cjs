const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
if (!process.env.ONELIFE_OLD_ADDRESS_PACKAGE) throw new Error('Point ONELIFE_OLD_ADDRESS_PACKAGE to a temporary extraction of country-state-city@3.2.1; never vendor it into this repository.');
const legacy = require(process.env.ONELIFE_OLD_ADDRESS_PACKAGE);
const current = require(path.join(root, 'backend/node_modules/@countrystatecity/countries'));
const keys = rows => [...new Set(rows.flatMap(Object.keys))].sort();
function compare(before, after, key) {
  const a = new Map(before.map(row => [key(row), row]));
  const b = new Map(after.map(row => [key(row), row]));
  const removed = [...a.keys()].filter(k => !b.has(k));
  const added = [...b.keys()].filter(k => !a.has(k));
  return { previousRows: before.length, currentRows: after.length, previousFields: keys(before), currentFields: keys(after), removedDistinctKeys: removed.length, addedDistinctKeys: added.length, removedExamples: removed.slice(0, 12), addedExamples: added.slice(0, 12) };
}
(async () => {
  const oldCountries = legacy.Country.getAllCountries(), countries = await current.getCountries();
  const oldStates = legacy.State.getAllStates(), states = (await Promise.all(countries.map(c => current.getStatesOfCountry(c.iso2)))).flat();
  const oldCities = legacy.City.getAllCities(), cities = await current.getAllCitiesInWorld();
  const report = {
    comparedPackages: ['country-state-city@3.2.1', '@countrystatecity/countries@2.0.0'],
    dataVersion: await current.getDataVersion(),
    countries: compare(oldCountries, countries, c => c.isoCode || c.iso2),
    states: compare(oldStates, states, s => `${s.countryCode || s.country_code}/${s.isoCode || s.iso2}`),
    cities: compare(oldCities, cities, c => `${c.countryCode || c.country_code}/${c.stateCode || c.state_code}/${c.name}`),
    india: {
      previousStates: legacy.State.getStatesOfCountry('IN').length,
      currentStates: states.filter(s => s.country_code === 'IN').length,
      removedStateCodes: legacy.State.getStatesOfCountry('IN').map(s => s.isoCode).filter(code => !states.some(s => s.country_code === 'IN' && s.iso2 === code)),
      addedStateCodes: states.filter(s => s.country_code === 'IN').map(s => s.iso2).filter(code => !oldStates.some(s => s.countryCode === 'IN' && s.isoCode === code)),
      previousMaharashtraCities: legacy.City.getCitiesOfState('IN', 'MH').length,
      currentMaharashtraCities: (await current.getCitiesOfState('IN', 'MH')).length,
    },
  };
  fs.writeFileSync(path.join(__dirname, 'address-comparison.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ packages: report.comparedPackages, previousRows: [oldCountries.length, oldStates.length, oldCities.length], currentRows: [countries.length, states.length, cities.length], india: report.india }, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
