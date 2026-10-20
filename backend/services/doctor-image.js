const fs = require("fs");
const path = require("path");

const assetDirectories = [
  { directory: path.resolve(__dirname, "..", "..", "frontend", "patient", "views", "assets"), url: "/assets" },
  { directory: path.resolve(__dirname, "..", "..", "frontend", "Admin", "assets"), url: "/admin-assets" },
  { directory: path.resolve(__dirname, "..", "..", "frontend", "Admin", "assets", "img"), url: "/admin-assets/img" },
  { directory: path.resolve(__dirname, "..", "..", "frontend", "doctor", "assets", "img"), url: "/doctor-assets/img" },
];

function doctorImage(image) {
  const fileName = path.basename(image || "");
  const match = assetDirectories.find(({ directory }) => fileName && fs.existsSync(path.join(directory, fileName)));
  if (match) {
    return `${match.url}/${fileName}`;
  }
  // Stable fallback: a doctor never receives a different photo after a refresh.
  return "/assets/onelife-clinician-generated.png";
}

module.exports = { doctorImage };
