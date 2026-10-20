const test = require("node:test");
const assert = require("node:assert/strict");

const { getallcities, getallcountries, getallstates } = require("../controller/address");

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
  assert.ok(countries.body.some((country) => country.iso2 === "IN"));

  const states = response();
  await getallstates({ params: { countryCode: "IN" } }, states);
  assert.equal(states.statusCode, 200);
  assert.ok(states.body.some((state) => state.iso2 === "MH"));

  const cities = response();
  await getallcities({ params: { countryCode: "IN", stateCode: "MH" } }, cities);
  assert.equal(cities.statusCode, 200);
  assert.ok(cities.body.some((city) => city.name === "Mumbai"));
});
