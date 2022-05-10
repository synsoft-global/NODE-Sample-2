module.exports = function (models) {
  var express = require("express");
  var router = express.Router();
  let auth = require("../controllers/auth.controller.js")(models);
  let common = require("../controllers/common.controller.js")(models);
  let account = require("../controllers/account.controller.js")(models);

  router.route("/register").post(function (req, res) {
    auth.registration(req, res);
  });
  router.route("/update").get(function (req, res) {
    auth.updateUserAddresses(req, res);
  });
  router.route("/updatenew").get(function (req, res) {
    auth.updateUserAddressesForNewCurrencies(req, res);
  });
  router.route("/checkIP").get(function (req, res) {
    auth.checkIP(req, res);
  });
  // router.route('/socialRegister')
  //     .post(function(req, res) {
  //         auth.social_registration(req, res);
  //     });
  router.route("/verifiyLogin").post(function (req, res) {
    auth.verifiy_login_code(req, res);
  });
  router.route("/login").post(function (req, res) {
    auth.user_login(req, res);
  });
  // router.route('/socialLogin')
  //     .post(function(req, res) {
  //         auth.user_social_login(req, res);
  //     });
  router.route("/forgotPassword").post(function (req, res) {
    auth.forgot_password(req, res);
  });
  router.route("/verifyForgotPassword").post(function (req, res) {
    auth.verify_forgot_password(req, res);
  });
  router.route("/verifyEmailCode").post(function (req, res) {
    auth.verify_email_code(req, res);
  });
  router.route("/generateSecret").post(function (req, res) {
    auth.generate_seceret_for_2fa(req, res);
  });
  router.route("/updateSecret").post(common.auth, function (req, res) {
    auth.update_seceret_for_2fa(req, res);
  });
  router.route("/updatePrefrences").post(common.auth, function (req, res) {
    auth.update_prefrences(req, res);
  });
  router.route("/forgotPassword").post(common.auth, function (req, res) {
    account.change_password(req, res);
  });
  router.route("/CheckEmailExist").post(function (req, res) {
    auth.CheckEmailExist(req, res);
  });

  router.route("/disable2fa").post(function (req, res) {
    auth.disable_2fa(req, res);
  });

  router.route("/ipTracker").post(function (req, res) {
    auth.ipTracker(req, res);
  });
  router.route("/UpdateipTracker").post(function (req, res) {
    auth.updateIpTracker(req, res);
  });

  router.route("/assigncolor").post(function (req, res) {
    auth.assignColor(req, res);
  });

  router.route("/getlockcolor/:id").get(function (req, res) {
    auth.lockColor(res, res);
  });

  router.route("/getunlockcolor/:id").get(function (req, res) {
    auth.unlockColor(res, res);
  });

  router.route("/getRates/:id").get(function (req, res) {
    auth.getRates(req, res);
  });

  router
    .route("/getuserBroadcastBalance")
    .get(common.auth, function (req, res) {
      auth.getuserBroadcastBalance(req, res);
    });

  router.route("/updateBroadcastbalance").post(function (req, res) {
    auth.updateBroadcastbalance(req, res);
  });

  router.route("/getchatscommand/:id").get(function (req, res) {
    auth.getchatscommand(req, res);
  });

  return router;
};
