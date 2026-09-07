const { validatetoken } = require("../services/auth");
function checkforauthentication(cookieName) {
  return (req, res, next) => {
    const tokencookievalue = req.cookies[cookieName];
    if (!tokencookievalue) {
      return next();
    }

    try {
      const userpayload = validatetoken(tokencookievalue);
      req.user = userpayload;  // Set user object in request
    } catch (error) {
      console.error("Token validation Error:", error);
      res.clearCookie(cookieName);
      return res.redirect("/login");  
    }
    next();
  };
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Please sign in to continue." });
  }
  return next();
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
      return res.status(403).render("error-404", {
        title: "Access Denied",
        message: "You do not have permission to access this page.",
      });
    }

    next();
  };
}

module.exports = {
  checkforauthentication,
  requireAuth,
  restrictTo,
};
