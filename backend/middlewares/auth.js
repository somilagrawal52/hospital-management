const { validatetoken } = require("../services/auth");

function checkforauthentication(_cookieName) {
  return (req, res, next) => {
    const tokencookievalue = req.cookies[_cookieName];
    console.log("Token cookie value:", tokencookievalue);
    if (!tokencookievalue) {
      console.log("No token found, redirecting to /user/signin");
      return res.redirect("/user/pages-login.html");
    }

    try {
      const userpayload = validatetoken(tokencookievalue);
      req.user = userpayload;
      console.log("Token validated, user payload:", userpayload);
      next();
    } catch (error) {
      console.error("Token validation Error:", error);
      res.clearCookie(_cookieName);
      return res.redirect("/user/pages-login.html");
    }
  };
}

module.exports = {
  checkforauthentication,
};
