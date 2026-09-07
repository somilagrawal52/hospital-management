const fs = require("fs");
const path = require("path");

const assetDirectories = [
  path.resolve(__dirname, "..", "..", "frontend", "patient", "views", "assets"),
  path.resolve(__dirname, "..", "..", "frontend", "Admin", "assets"),
  path.resolve(__dirname, "..", "..", "frontend", "Admin", "assets", "img"),
  path.resolve(__dirname, "..", "..", "frontend", "doctor", "assets", "img"),
];

function doctorImage(image) {
  const fileName = path.basename(image || "");
  if (fileName && assetDirectories.some((directory) => fs.existsSync(path.join(directory, fileName)))) {
    return `/assets/${fileName}`;
  }
  // Stable fallback: a doctor never receives a different photo after a refresh.
  return "/assets/doc1.png";
}

module.exports = { doctorImage };
