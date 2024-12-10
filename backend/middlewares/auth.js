const { validatetoken } = require("../services/auth");
const path = require("path");
const frontendPath = path.resolve(__dirname, "..", "..", "frontend", "Admin");
function checkforauthentication() {
  return (req, res, next) => {
    console.log(req.cookies);
    const tokencookievalue = req.cookies.token;
    console.log("Token cookie value:", tokencookievalue);
    if (!tokencookievalue) {
      console.log("No token found, redirecting to login");
      if (req.originalUrl.startsWith("/doctor")) {
        return res.redirect("/doctorlogin");
      }
      return res.redirect("/admin/login");
    }

    try {
      const userpayload = validatetoken(tokencookievalue);
      req.user = userpayload;
      console.log("Token validated, user payload:", userpayload);
      next();
    } catch (error) {
      console.error("Token validation Error:", error);
      res.clearCookie(_cookieName);
      return res.redirect("/admin/login");
    }
  };
}

function restrictTo(roles = []) {
  return function (req, res, next) {
    console.log("User info: ", req.user);

    if (!req.user) {
      if (req.originalUrl.startsWith("/admin")) {
        return res.redirect("/admin/login");
      } else if (req.originalUrl.startsWith("/doctor")) {
        return res.redirect("/doctorlogin");
      } else {
        return res.redirect("/admin/login");
      }
    }

    if (!roles.includes(req.user.role)) {
      res.clearCookie("token");
      return res.sendFile(path.join(frontendPath, "pages-error-404.html"));
    }

    next();
  };
}

module.exports = {
  checkforauthentication,
  restrictTo,
};
