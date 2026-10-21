// Geographic data is intentionally a separately licensed component. See
// THIRD_PARTY_NOTICES.md before redistributing a package that includes it.
const addressData = require("../services/address-data");

function attribution(res) {
  res.set?.("Link", '<https://opendatacommons.org/licenses/odbl/1-0/>; rel="license", <https://github.com/dr5hn/countries-states-cities-database>; rel="describedby"');
}

async function getallcountries(req, res) {
  try {
    attribution(res);
    res.json(await addressData.countries());
  } catch (error) {
    console.error("Error fetching countries:", error.message);
    res.status(500).json({ message: "Unable to load address data." });
  }
}

async function getallstates(req, res) {
  try {
    const countryCode = req.params.countryCode;
    attribution(res);
    res.json(await addressData.states(countryCode));
  } catch (error) {
    console.error("Error fetching states:", error.message);
    res.status(500).json({ message: "Unable to load address data." });
  }
}

async function getallcities(req, res) {
  try {
    const { stateCode, countryCode } = req.params;
    attribution(res);
    res.json(await addressData.cities(countryCode, stateCode));
  } catch (error) {
    console.error("Error fetching cities:", error.message);
    res.status(500).json({ message: "Unable to load address data." });
  }
}

module.exports = {
  getallcities,
  getallcountries,
  getallstates,
};
