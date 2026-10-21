const test = require("node:test");
const assert = require("node:assert/strict");

const { getallcities, getallcountries, getallstates } = require("../controller/address");
const addressData = require("../services/address-data");

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
  };
}

test("address endpoints retain their country/state/city response contract", async () => {
  const countries = response();
  await getallcountries({}, countries);
  assert.equal(countries.statusCode, 200);
  assert.ok(Array.isArray(countries.body));
  assert.ok(countries.body.some((country) => country.isoCode === "IN"));

  const states = response();
  await getallstates({ params: { countryCode: "IN" } }, states);
  assert.equal(states.statusCode, 200);
  assert.ok(states.body.some((state) => state.isoCode === "MH"));

  const cities = response();
  await getallcities({ params: { countryCode: "IN", stateCode: "MH" } }, cities);
  assert.equal(cities.statusCode, 200);
  assert.ok(cities.body.some((city) => city.name === "Mumbai"));
});

test("country projections restore the complete legacy field contract and timezones", async () => {
  const rows = await addressData.countries();
  assert.equal(rows.length, 250);
  for (const code of ["IN", "US", "GB", "AU", "DE"]) {
    const country = rows.find(row => row.isoCode === code);
    assert.deepEqual(Object.keys(country).sort(), ["name", "isoCode", "flag", "phonecode", "currency", "latitude", "longitude", "timezones"].sort());
    assert.ok(country.timezones.length);
    assert.equal(typeof country.phonecode, "string");
    assert.equal(typeof country.latitude, "string");
    assert.equal(typeof country.timezones[0].gmtOffset, "number");
  }
});
test("state and city projections preserve legacy fields and name ordering across countries", async () => {
  for (const [country, state, city] of [["IN", "MH", "Mumbai"], ["US", "CA", "Los Angeles"], ["AU", "NSW", "Sydney"]]) {
    const states = await addressData.states(country), cities = await addressData.cities(country, state);
    assert.ok(states.some(row => row.isoCode === state));
    assert.ok(cities.some(row => row.name === city));
    assert.deepEqual(Object.keys(states[0]).sort(), ["name", "isoCode", "countryCode", "latitude", "longitude"].sort());
    assert.deepEqual(Object.keys(cities[0]).sort(), ["name", "countryCode", "stateCode", "latitude", "longitude"].sort());
    assert.deepEqual(cities.map(row => row.name), cities.map(row => row.name).sort());
    assert.ok(cities.every(row => row.countryCode === country && row.stateCode === state && typeof row.longitude === "string"));
  }
});
test("Uttarakhand supports both UT and UK input without changing stored records", async () => {
  const rows = await addressData.states("IN");
  assert.ok(rows.some(row => row.name === "Uttarakhand" && row.isoCode === "UT"));
  assert.equal(rows.some(row => row.isoCode === "UK"), false);
  const legacy = await addressData.cities("IN", "UT"), modern = await addressData.cities("IN", "UK");
  assert.ok(legacy.length); assert.deepEqual(legacy, modern);
  assert.ok(legacy.every(row => row.stateCode === "UT"));
});
test("unsupported and lowercase address identifiers retain empty-array behavior", async () => {
  assert.deepEqual(await addressData.states("ZZ"), []);
  assert.deepEqual(await addressData.states("in"), []);
  assert.deepEqual(await addressData.cities("IN", "invalid"), []);
  assert.deepEqual(await addressData.cities("in", "mh"), []);
});
