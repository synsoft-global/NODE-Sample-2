const bcrypt = require("bcryptjs");
const saltRounds = 10,
  Sequelize = require("sequelize"),
  Op = Sequelize.Op,
  crypto = require("crypto");
let globals = require("../global.js"),
  configs = require("../config.js"),
  helpers = require("../helper/helper.js"),
  mailHelper = require("../helper/mailerHelper"),
  twoFactor = require("node-2fa"),
  speakeasy = require("speakeasy"),
  jwt = require("jsonwebtoken"),
  logger = require("../helper/log.js"),
  provablyFair = require("../helper/provably-fair.js"),
  authService = require("../services/auth.service.js");

module.exports = function (models) {
  let common_ctrl = require("../controllers/common.controller.js")(models),
    crypto_ctrl = require("../controllers/cryptocurrency.controller.js")(
      models
    );

  /**
   * Objective: "Common function for user creation"
   * @param {object} userData
   * @param {function} cb
   **/
  create_user = async function (userData, cb) {
    // send the user's details to the database
    let hash = "";
    let social_ids = {};
    if (userData.password) {
      let salt = bcrypt.genSaltSync(saltRounds);
      hash = bcrypt.hashSync(userData.password, salt);
    }

    if (userData.google_id || userData.fb_id) {
      social_ids = {
        google_id: userData.google_id ? userData.google_id : "",
        fb_id: userData.fb_id ? userData.fb_id : "",
      };
    }

    let key = crypto.randomBytes(16);
    let key2 = crypto.randomBytes(16);
    let server_seed = provablyFair.createHash_ev(key);
    let server_seed_hash = provablyFair.createHash_ev(server_seed);
    let next_server_seed = provablyFair.createHash_ev(key2);
    let next_server_seed_hash = provablyFair.createHash_ev(next_server_seed);
    let client_seed = crypto.randomBytes(4).toString("hex");
    let next_client_seed = crypto.randomBytes(4).toString("hex");
    let referral_code = helpers.createReferalCode(6);

    // First, we start a transaction and save it into a variable
    const t = await models.sequelize.transaction();
    let email_verification_code = helpers.generate_code();

    try {
      //create user
      models.Users.create({
        email: userData.email,
        username: userData.username,
        password: hash,
        emailVerificationCode: email_verification_code,
        referred_id: userData.referral_by,
        UserDetail: {},
        ip: userData.ip ? userData.ip : "127.0.0.1",
        status: "active",
        referral_code: referral_code,
      }).then(async function (user) {
        // return new Promise(function(resolve, reject) {
        await models.UserBalances.bulkCreate([
          {
            user_id: user.id,
            currency: 1,
          },
          {
            user_id: user.id,
            currency: 2,
          },
          {
            user_id: user.id,
            currency: 3,
          },
          {
            user_id: user.id,
            currency: 4,
          },
          {
            user_id: user.id,
            currency: 5,
          },
          {
            user_id: user.id,
            currency: 6,
          },
        ]);
        // Creates user's fairness entry
        await models.Fairness.bulkCreate([
          {
            user_id: user.id,
            server_seed: server_seed,
            hashed_server_seed: server_seed_hash,
            active: 1,
          },
          {
            user_id: user.id,
            server_seed: next_server_seed,
            hashed_server_seed: next_server_seed_hash,
            active: 2,
          },
        ]);
        // create usermeta against user...
        await models.UserMeta.create({
          user_id: user.id,
          social_ids: social_ids ? social_ids : {},
          seed_information: {
            client_seed: client_seed,
            server_seed_hash: server_seed_hash,
            nonce: 0,
            next_client_seed: next_client_seed,
            next_server_seed_hash: next_server_seed_hash,
          },
        });
        createCryptoAddresses(user.id);
        await t.commit();
        mailHelper.SendEmailUserRegister(
          userData.email,
          globals.SUBJ_USER_REGITERS_SUCCESS,
          {
            name: userData.username,
            link:
              configs.Verify_Email_link +
              "code=" +
              email_verification_code +
              "&email=" +
              userData.email,
          }
        );
        cb(true, user);
      });
    } catch (error) {
      // If the execution reaches this line, an error was thrown.
      // We rollback the transaction.
      await t.rollback();
      cb(false, error.errors[0].message);
    }
  };

  /**
   * Objective: "Create crypto Address for user on register"
   * @param {object} id - user id
   **/
  createCryptoAddresses = async function (
    id,
    code = undefined,
    currency_id = undefined,
    update = true
  ) {
    try {
      let pwd = await helpers.getData();
      if (code && currency_id) {
        let currAddress = await crypto_ctrl.createAddresses(
          code,
          {
            name: configs.walletName,
          },
          pwd
        );
        if (currAddress && currAddress.address) {
          if (update) {
            authService.updateData(
              "UserBalances",
              { address: currAddress.address },
              {
                user_id: id,
                currency: currency_id,
              }
            );
          } else {
            models.UserBalances.create({
              address: currAddress.address,
              user_id: id,
              currency: currency_id,
            });
          }
        }
      } else {
        let userBalData = [];
        const currency_list = await models.MasterCurrency.findAll({
          attribute: ["id", "name", "code"],
          raw: true,
          where: {
            code: {
              [Op.ne]: "EVEON",
            },
          },
        });

        currency_list.forEach(async (curr, i) => {
          let currAddress = await crypto_ctrl.createAddresses(
            curr.code,
            {
              name: configs.walletName,
            },
            pwd
          );
          setTimeout(function () {
            if (currAddress && currAddress.address) {
              let address = currAddress.address.split(":")[1];
              authService.updateData(
                "UserBalances",
                { address: currAddress.address },
                {
                  user_id: id,
                  currency: curr.id,
                }
              );
            }
          }, i * 500);
        });
      }
    } catch (error) {
      logger.createLog(error, "createCryptoAddresses --auth");
    }
  };

  /**
   * Objective: "Common function for user detail and token creation for logged in user"
   * @param {string} id - user id
   * @param {object} cb - callback
   **/
  get_logged_in_user_detail = function (id, cb) {
    models.Users.findOne({
      include: [
        {
          model: models.UserMeta,
          as: "UserDetail",
          attributes: [
            "ignored_users",
            "preferences",
            "social_ids",
            "seed_information",
            "friends",
          ],
        },
      ],
      attribute: {
        exclude: [
          "password",
          "two_fa_key",
          "verify_hash_fp",
          "emailVerificationCode",
          "mobile_number",
          // "eveon_counter",
          // "counter",
          "country_code",
          "country",
          "two_fa_enabled",
          "createdAt",
          "updatedAt",
          "token",
        ],
      },
      where: {
        id: id,
      },
    })
      .then(function (user) {
        // Call for adding to Global Users
        helpers.getGlobalUserDetail(user.id);

        delete user["dataValues"]["password"];
        delete user["dataValues"]["two_fa_key"];
        delete user["dataValues"]["verify_hash_fp"];
        user["dataValues"]["role"] = configs.ROLE;
        createTokenData(user["dataValues"], function (data) {
          cb(true, data);
        });
      })
      .catch(function (error) {
        logger.createLog(error, req.route.path);
        cb(false, error);
      });
  };

  /**
   * Objective: "user registration"
   * @param {object} req - request object
   * @param {object} res - response object
   **/
  registration = async function (req, res) {
    try {
      let data = req.body;
      if (!!data.username && !!data.email && !!data.password) {
        common_ctrl.CheckEmailExist(data.email, function (email) {
          common_ctrl.CheckUserNameExist(data.username, async function (
            username
          ) {
            if (username) {
              data = {};
              data.statuscode = globals.Failed;
              data.message = globals.USERNAME_ALREADY_EXISTS; //'user name allready exist';
              return res.json(data);
            }

            if (email) {
              data = {};
              data.statuscode = globals.Failed;
              data.message = globals.EMAIL_ALREADY_EXISTS;
              return res.json(data);
            }

            var salt = bcrypt.genSaltSync(saltRounds);
            var hash = bcrypt.hashSync(data.password, salt);
            var social_ids = JSON.stringify({
              google_id: "",
            });
            var newSecret = twoFactor.generateSecret({
              name: "Dice Game",
              account: data.username,
            });

            if (data.referral_code) {
              let referral_by = await helpers.getCodeDetail(data.referral_code);
              data.referral_by = referral_by;
            }

            if (hash) {
              // send the user's details to the database
              create_user(data, function (result, detail) {
                if (result) {
                  get_logged_in_user_detail(detail.id, function (
                    isUserFound,
                    userDetail
                  ) {
                    if (isUserFound) {
                      res.send(userDetail);
                    } else {
                      return res.json({
                        statuscode: globals.Failed,
                        message: userDetail,
                      });
                    }
                  });
                } else {
                  return res.json({
                    statuscode: globals.Failed,
                    message: detail,
                  });
                }
              });
            }
          });
        });
      } else {
        data = {};
        data.statuscode = globals.Failed;
        data.message = globals.REQUIRED_FIELD_MISSING;
        res.send(data);
      }
    } catch (error) {
      logger.createLog(error, req.route.path);
      let data = {};
      data.statuscode = globals.Failed;
      data.message = globals.SOMETHING_WENT_WRONG;
      res.send(data);
    }
  };
  
  /**
   * Objective: "Verify the 2fa verification code sent"
   * @param {object} req - request object
   * @param {object} res - response object
   **/
  verifiy_login_code = async function (req, res) {
    try {
      let data = {};
      data = req.body;
      if (!!data.id && !!data.verificationCode) {
        models.Users.findAll({
          include: [
            {
              model: models.UserMeta,
              as: "UserDetail",
              attributes: [
                "ignored_users",
                "preferences",
                "social_ids",
                "friends",
              ],
            },
          ],
          where: {
            id: data.id,
          },
        })
          .then(function (user) {
            // Let's say we stored the user's temporary secret in a user object like above:
            // (This is specific to your implementation)
            var base32secret = user[0].two_fa_key;
            // Use verify() to check the token against the secret

            var isTokenVerified = speakeasy.totp.verify({
              secret: base32secret,
              encoding: "base32",
              token: data.verificationCode,
              window: 6,
            });

            if (!isTokenVerified) {
              data = {};
              data.statuscode = globals.Failed;
              data.message = globals.INCORRECT_VERIFICATION_CODE;
              res.send(data);
            } else {
              delete user[0]["dataValues"]["password"];
              delete user[0]["dataValues"]["two_fa_key"];
              delete user[0]["dataValues"]["verify_hash_fp"];
              delete user[0]["dataValues"]["token"];
              user[0]["dataValues"]["role"] = configs.ROLE;
              createTokenData(user[0]["dataValues"], function (data) {
                res.send(data);
              });
            }
          })
          .catch(function (error) {
            logger.createLog(error, req.route.path);
            return res.json({
              statuscode: globals.Failed,
              message: globals.SOMETHING_WENT_WRONG,
            });
          });
      } else {
        data = {};
        data.statuscode = globals.Failed;
        data.message = globals.REQUIRED_FIELD_MISSING;
        res.send(data);
      }
    } catch (error) {
      logger.createLog(error, req.route.path);
      let data = {};
      data.statuscode = globals.Failed;
      data.message = globals.SOMETHING_WENT_WRONG;
      res.send(data);
    }
  };

  /**
   * Objective: "user login"
   * @param {object} req - request object
   * @param {object} res - response object
   **/
  user_login = async function (req, res) {
    try {
      let data = {};
      data = req.body;
      if ((!!data.email || !!data.username) && !!data.password) {
        // check if user exists and username and password matches
        models.Users.findAll({
          attribute: {
            exclude: [
              "emailVerificationCode",
              "mobile_number",
              // "eveon_counter",
              // "counter",
              "country_code",
              "country",
              "createdAt",
              "updatedAt",
              "token",
            ],
          },
          include: [
            {
              model: models.UserMeta,
              as: "UserDetail",
              attributes: [
                "ignored_users",
                "preferences",
                "social_ids",
                "seed_information",
                "friends",
              ],
            },
          ],
          where: {
            [Op.or]: [
              { email: data.username },
              { username: data.username },
              // { email: { [Op.like]: "%" + data.username + "%" } },
              // { username: { [Op.like]: "%" + data.username + "%" } }
            ],
          },
        })
          .then(function (user) {
            if (user && user.length > 0) {
              var isPasswordValid = bcrypt.compareSync(
                data.password,
                user[0].password
              );

              if (!isPasswordValid) {
                return res.send({
                  statuscode: 0,
                  message: globals.INVALID_ID_PWD,
                });
              } else if (user[0].status != "active") {
                return res.send({
                  statuscode: 0,
                  message: globals.USER_NOT_ACTIVE,
                });
              } else {
                if (user[0]["two_fa_enabled"]) {
                  data = {};
                  data.statuscode = globals.OTP;
                  delete user[0]["dataValues"]["password"];
                  delete user[0]["dataValues"]["two_fa_key"];
                  delete user[0]["dataValues"]["verify_hash_fp"];

                  let email = helpers.modifyEmail(
                    user[0]["dataValues"]["email"]
                  );
                  data.user_info = user[0]["dataValues"];
                  data.user_info.email = email;
                  data.email = email;
                  data.message = globals.VERIFICATION_CODE_SENT_SUCC;

                  res.send(data);
                } else {
                  // Call for adding to Global Users
                  helpers.getGlobalUserDetail(user[0]["dataValues"].id);
                  delete user[0]["dataValues"]["password"];
                  delete user[0]["dataValues"]["two_fa_key"];
                  delete user[0]["dataValues"]["verify_hash_fp"];
                  data.user_info = user[0]["dataValues"];
                  user[0]["dataValues"]["role"] = configs.ROLE;
                  createTokenData(user[0]["dataValues"], function (data) {
                    res.send(data);
                  });
                }
              }
            } else {
              data = {};
              data.statuscode = globals.Failed;
              data.message = globals.NO_ACCOUNT_FOUND;
              res.send(data);
            }
          })
          .catch(function (err) {
            logger.createLog(err, req.route.path);
            return res.json({
              statuscode: globals.Failed,
              message: globals.SOMETHING_WENT_WRONG,
            });
          });
      } else {
        data = {};
        data.statuscode = globals.Failed;
        data.message = globals.REQUIRED_FIELD_MISSING;
        res.send(data);
      }
    } catch (error) {
      logger.createLog(error, req.route.path);
      data = {};
      data.statuscode = globals.Failed;
      data.message = globals.SOMETHING_WENT_WRONG;
      res.send(data);
    }
  };

  /**
   * Objective: "user forgot password"
   * @param {object} req - request object
   * @param {object} res - response object
   **/
  forgot_password = async function (req, res) {
    try {
      let data = req.body;
      let request = {};
      if (
        data.email != null &&
        data.email != "" &&
        data.email != undefined &&
        data.email.indexOf("@") > -1
      ) {
        let user = await authService.findAll("Users", { email: data.email})
        if (user && user.length > 0 && user[0].status != "active") {
          data = {};
          data.statuscode = globals.Failed;
          data.message = globals.USER_NOT_ACTIVE;
          res.send(data);
        } else if (user && user.length > 0) {
          let verify_hash_fp = helpers.generate_code();
          let updateUsers = await authService.updateData(
            "Users",
            {
              verify_hash_fp: verify_hash_fp,
            },
            {
              email: data.email,
            }
          );

          if (updateUsers) {
            var link =
              configs.Forgot_Password_link +
              "id=" +
              user[0].id +
              "&code=" +
              verify_hash_fp;
            mailHelper.SendEmailFP(
              user[0].email,
              `${globals.SUBJ_USER_FORGOT_PASSWORD} ${user[0].username}`,
              { name: user[0].username, link }
            );
            data = {};
            data.statuscode = globals.OK;
            data.message = globals.FP_LINK_SENT_SUCC;
            res.send(data);
          } else {
            data = {};
            data.statuscode = globals.Failed;
            data.message = globals.SOMETHING_WENT_WRONG;
            res.send(data);
          }
        } else {
          data = {};
          data.statuscode = globals.Failed;
          data.message = globals.NO_ACCOUNT_REGISTERED;
          res.send(data);
        }
      } else {
        data = {};
        data.statuscode = globals.Failed;
        data.message = globals.REQUIRED_FIELD_MISSING;
        res.send(data);
      }
    } catch (error) {
      logger.createLog(error, req.route.path);
      let data = {};
      data.statuscode = globals.Failed;
      data.message = globals.SOMETHING_WENT_WRONG;
      res.send(data);
    }
  };

  /**
  * Objective: "verify user email verification link to reset password"
  Note*: We have set status as active (Only in case when status is Pending) because in case email verification link is not sent to user at time of registration then the user will perform forgot password and once he verify his email for fp then we will activate his account. Don't Activate user account if his account is already disabled by Admin.
  * @param {object} req - request object
  * @param {object} res - response object
  **/
  verify_forgot_password = async function (req, res) {
    try {
      let data = req.body;
      let request = {};
      //We have not encrypted password here
      //password should be encrypted by front end
      if (
        !!data.id &&
        !!data.fp_email_verification_code &&
        !!data.newPassword
      ) {
        models.Users.findOne({
          where: {
            id: data.id,
            verify_hash_fp: data.fp_email_verification_code,
          },
        })
          .then(async function (user) {
            if (user && user.dataValues.status != "active") {
              data = {};
              data.statuscode = globals.Failed;
              data.message = globals.Disabled_USER;
              return res.send(data);
            } else if (user) {
              var hash = bcrypt.hashSync(data.newPassword, saltRounds);
              if (hash) {
                let updateUsers = await authService.updateData(
                  "Users",
                  {
                    verify_hash_fp: null,
                    password: hash,
                  },
                  {
                    id: data.id,
                  }
                );

                if (updateUsers) {
                  if (user != null) {
                    // Call for adding to Global Users
                    helpers.getGlobalUserDetail(user.id);
                    delete user.dataValues.password;
                    delete user.dataValues.two_fa_key;
                    delete user.dataValues.verify_hash_fp;
                    delete user.dataValues.token;
                    data.statuscode = globals.OK;
                    data.user_info = user.dataValues;
                    user.dataValues.role = configs.ROLE;
                    createTokenData(user.dataValues, function (data) {
                      data.verify_message = globals.PSWD_UPDATED_SUCC;
                      res.send(data);
                    });
                  }
                  // data = {};
                  // data.statuscode = globals.OK;
                  // data.message = globals.PSWD_UPDATED_SUCC;
                  // return res.send(data);
                } else {
                  data = {};
                  data.statuscode = globals.Failed;
                  data.message = globals.PSWD_UPDATED_FAILED;
                  return res.send(data);
                }
              } else {
                data = {};
                data.statuscode = globals.Failed;
                data.message = globals.SOMETHING_WENT_WRONG;
                return res.send(data);
              }
            } else {
              data = {};
              data.statuscode = globals.Failed;
              data.message = globals.FP_LINK_INVALID;
              return res.send(data);
            }
            // }
          })
          .catch(function (err) {
            logger.createLog(err, req.route.path);
            data = {};
            data.statuscode = globals.Failed;
            data.message = globals.SOMETHING_WENT_WRONG;
            return res.send(data);
          });
      } else {
        data = {};
        data.statuscode = globals.Failed;
        data.message = globals.REQUIRED_FIELD_MISSING;
        return res.send(data);
      }
    } catch (error) {
      logger.createLog(error, req.route.path);
      let data = {};
      data.statuscode = globals.Failed;
      data.message = globals.SOMETHING_WENT_WRONG;
      res.send(data);
    }
  };

  /**
  Used as common function in other controllers.
  * Objective: "Check if given email exists in db or not."
  * @param {object} req - request object
  * @param {object} res - response object
  **/
  CheckEmailExist = async function (req, res) {
    try {
      let users = await authService.findAll("Users", {
          email: req.body.email,
      })
      if (users.length > 0) {
        data = {};
        data.statuscode = globals.OK;
        return res.send(data);
      } else {
        data = {};
        data.statuscode = globals.Failed;
        return res.send(data);
      }
    } catch (error) {
      logger.createLog(error, req.route.path);
      data = {};
      data.statuscode = globals.Failed;
      data.message = globals.SOMETHING_WENT_WRONG;
      return res.send(data);
    }
  };

  /**
   * Objective: "create token and login data common function"
   * @param {object} userData
   * @param {object} cb - callback
   **/
  createTokenData = async function (userData, cb) {
    try {
      let data = {};
      data.statuscode = globals.OK;
      data.message = globals.USER_LOGGED_IN_SUCCESS;
      delete userData.token;
      let token = jwt.sign(userData, configs.jwt_secret, {
        expiresIn: configs.TOKEN_EXPIRATION_TIME,
      });

      await helpers.updateData("Users", { token }, { id: userData.id });
      crypto_ctrl.refreshBal(userData.id, userData.email, userData.username);
      // modify user email to be sent to the frontend
      let email = helpers.modifyEmail(userData["email"]);
      userData["email"] = email;

      data.token = token;
      data.user_info = userData;
      // refresh balance
      createAddressHookOnLogin(userData.id);
      cb(data);
    } catch (error) {
      logger.createLog(error, "create token");
    }
  };

  /**
   * Objective: "create a hook for all user addresses"
   * @param {string} id
   **/
  createAddressHookOnLogin = function (id) {
    try {
      models.UserBalances.findAll({
        include: {
          model: models.MasterCurrency,
          as: "Curr",
        },
        where: { user_id: id },
      })
        .then(function (balances) {
          balances.forEach(async (bal) => {
            if (bal && bal.address) {
              let isWebhookPresent = await crypto_ctrl.removeAddressHook(
                bal.address,
                bal.Curr.code
              );
              if (isWebhookPresent) {
                crypto_ctrl.addAddressHook(bal.address, bal.Curr.code);
              }
            }
          });
        })
        .catch(function (error) {
          logger.createLog(error, "createAddressHookOnLogin");
        });
    } catch (error) {
      logger.createLog(error, "createAddressHookOnLogin");
      data = {};
      data.statuscode = globals.Failed;
      data.message = globals.SOMETHING_WENT_WRONG;
      res.send(data);
    }
  };

  getRates = function (req, res) {
    try {
      let coin = req.params.id;
      helpers.getRatesGloabal(coin, function (rates) {
        data = {};
        data.statuscode = globals.OK;
        data.rates = rates;
        return res.send(data);
      });
    } catch (error) {
      logger.createLog(error, req.route.path);
      data = {};
      data.statuscode = globals.Failed;
      data.message = globals.SOMETHING_WENT_WRONG;
      res.send(data);
    }
  };
  /**
   * obeject : get user broadcast balance
   */
  getuserBroadcastBalance = function (req, res) {
    try {
      let usersId = req.id;
      let query2 = {
        where: { id: usersId },
        attributes: [
          "id",
          "username",
          "rank",
          "admin_assigned_label",
          "vip_label",
          "broadcast_balances",
        ],
      };
      models.Users.findOne(query2)
        .then(async function (user) {
          let query2 = {
            where: { rank: user.rank },
            // attributes: ["id", "rank","broadcast_limit", "broadcast_time", "unlock_colors",],
          };
          models.MasterRanks.findOne(query2)
            .then(async function (ranks) {
              let data = {};
              data.statuscode = globals.OK;
              data.users = user;
              data.rankDetail = ranks;
              res.send(data);
            })
            .catch(function (error) {
              logger.createLog(error, req.route.path);
              data = {};
              data.statuscode = globals.Failed;
              data.message = globals.SOMETHING_WENT_WRONG;
              res.send(data);
            });
        })
        .catch(function (error) {
          logger.createLog(error, req.route.path);
          data = {};
          data.statuscode = globals.Failed;
          data.message = globals.SOMETHING_WENT_WRONG;
          res.send(data);
        });
    } catch (error) {
      logger.createLog(error, req.route.path);
      data = {};
      data.statuscode = globals.Failed;
      data.message = globals.SOMETHING_WENT_WRONG;
      res.send(data);
    }
  };
  /**
   * object: update user broadcast balance afetr broadcast
   */
  updateBroadcastbalance = function (req, res) {
    try {
      let requestData = req.body;
      if (requestData.broadcastValue > 0 && requestData.message) {
        if (requestData.broadcast_limit < 0) {
          data = {};
          data.statuscode = globals.Failed;
          data.message = globals.error;
          res.send(data);
        } else {
          let updateUsers = helpers.updateData(
            "Users",
            { broadcast_balances: requestData.broadcast_limit },
            { id: requestData.id }
          );
          if (updateUsers) {
            let query = {
              where: { rank: requestData.rank },
            };
            models.MasterRanks.findAll(query)
              .then(function (rank) {
                let data = {};
                data.statuscode = globals.OK;
                data.timelimit = rank[0].broadcast_time;
                res.send(data);
              })
              .catch(function (error) {
                let data = {};
                data.statuscode = globals.Failed;
                data.message = globals.SOMETHING_WENT_WRONG;
                res.send(data);
              });
          } else {
            data = {};
            data.statuscode = globals.Failed;
            data.message = globals.error;
            res.send(data);
          }
        }
      } else {
        data = {};
        data.statuscode = globals.Failed;
        if (requestData.broadcastValue <= 0) {
          data.message = globals.BROADCAST_REQUIRED;
        } else {
          data.message = globals.REQUIRED_FIELD_MISSING;
        }
        res.send(data);
      }
    } catch (error) {
      logger.createLog(error, req.route.path);
      let data = {};
      data.statuscode = globals.Failed;
      data.message = globals.SOMETHING_WENT_WRONG;
      res.send(data);
    }
  };
 
  return {
    verify_forgot_password: verify_forgot_password,
    forgot_password: forgot_password,
    user_login: user_login,
    verifiy_login_code: verifiy_login_code,
    registration: registration,
    CheckEmailExist: CheckEmailExist,
  };
};
