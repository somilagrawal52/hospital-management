const { Country, State, City } = require("country-state-city");

async function getallcountries(req, res) {
  const countries = Country.getAllCountries();
  res.json(countries);
}

async function getallstates(req, res) {
  try {
    const countryCode = req.params.countryCode;
    const states = State.getStatesOfCountry(countryCode);
    res.json(states);
  } catch (error) {
    console.error("Error fetching states:", error);
    res.status(500).json({ message: "Server error" });
  }
}

async function getallcities(req, res) {
  const stateCode = req.params.stateCode;
  const countryCode = req.params.countryCode;

  const cities = City.getCitiesOfState(countryCode, stateCode);

  res.json(cities);
}

module.exports = {
  getallcities,
  getallcountries,
  getallstates,
};
