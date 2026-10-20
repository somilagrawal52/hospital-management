// Geographic data is intentionally a separately licensed component. See
// THIRD_PARTY_NOTICES.md before redistributing a package that includes it.
const {
  getCountries,
  getStatesOfCountry,
  getCitiesOfState,
} = require("@countrystatecity/countries");

async function getallcountries(req, res) {
  try {
    res.json(await getCountries());
  } catch (error) {
    console.error("Error fetching countries:", error.message);
    res.status(500).json({ message: "Unable to load address data." });
  }
}

async function getallstates(req, res) {
  try {
    const countryCode = req.params.countryCode;
    res.json(await getStatesOfCountry(countryCode));
  } catch (error) {
    console.error("Error fetching states:", error.message);
    res.status(500).json({ message: "Unable to load address data." });
  }
}

async function getallcities(req, res) {
  try {
    const { stateCode, countryCode } = req.params;
    res.json(await getCitiesOfState(countryCode, stateCode));
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
