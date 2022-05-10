const nodemailer = require("nodemailer");
let configs = require("../config.js"),
  globals = require("../global.js"),
  env = "dev",
  jwt = require("jsonwebtoken"),
  models = require("../models/index")(env),
  _ = require("lodash"),
  Sequelize = require("sequelize"),
  Op = Sequelize.Op;

// UsersData = {};

const smtpConfig = {
  host: configs.Email_Host,
  secureConnection: true,
  port: configs.Email_Port,
  auth: {
    user: configs.Email_User,
    pass: configs.Email_Password,
  },
  authMethod: "PLAIN",
  tls: { rejectUnauthorized: false },
  debug: true,
};

const smtpTransport = nodemailer.createTransport(smtpConfig);
/**
 * Export functions from helper
 */
module.exports = {
  paginate: paginate,
  send_email: send_email,
  verify_token: verify_token,
  getRandom: getRandom,
  getRandomGroupId: getRandomGroupId,
  createReferalCode: createReferalCode,
  parseJSONData: parseJSONData,
  setGlobalData: setGlobalData,
  getGlobalData: getGlobalData,
  deleteGlobalData: deleteGlobalData,
  updateGlobalData: updateGlobalData,
  updateGlobalDataKey: updateGlobalDataKey,
};

/***
 * set global data
 */
function setGlobalData(data) {
  UsersData = data;
}

/***
 * get global data
 */
function getGlobalData() {
  return UsersData;
}

/***
 * update global data
 */
function updateGlobalData(key, data, cb) {
  if (!UsersData[key]) {
    UsersData[key] = {};
  }
  UsersData[key] = data;
  if (cb) {
    cb(true);
  }
}

/***
 * update global data
 */
function updateGlobalDataKey(id, key, value) {
  if (!UsersData[id]) {
    UsersData[id] = {};
  }
  UsersData[id][key] = value;
}

/***
 * update global data
 */
function deleteGlobalData(key, keepChatSocketId = false) {
  // if keepChatSocketId then only seed related info will be deleted
  if (keepChatSocketId) {
    let chatId = undefined;
    if (UsersData[key] && UsersData[key].hasOwnProperty("chatSocketId")) {
      chatId = UsersData[key]["chatSocketId"];
    }

    delete UsersData[key];
    if (chatId) {
      UsersData[key] = {};
      UsersData[key]["chatSocketId"] = chatId;
    }
  } else {
    delete UsersData[key];
  }
}

/**
 *
 * @param {Object} param contains page and pagesize
 */

function paginate({ page, pageSize }) {
  const offset = page * +pageSize;
  // const limit = offset + pageSize;
  const limit = +pageSize;

  return {
    offset,
    limit,
  };
}

/**
 * Send email
 * @param {*} EmailAddress
 * @param {*} subject
 * @param {*} msgbody
 */
function send_email(EmailAddress, subject, msgbody) {
  let mailOptions = {
    from: configs.Email_From,
    to: EmailAddress,
    subject: subject,
    html: msgbody,
  };
  smtpTransport.sendMail(mailOptions, function (error, response) {
    if (error) console.log("SendEmail", error);
  });
}

/**
 * To generate a code from random string
 * @param {Number} len
 */
function createReferalCode(len) {
  var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return [...Array(len)].reduce((a) => a + p[~~(Math.random() * p.length)], "");
}

function getRandom(len) {
  var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return [...Array(len)].reduce((a) => a + p[~~(Math.random() * p.length)], "");
}

function getRandomGroupId(len) {
  let res = getRandom(len);
  let data = models.Bets.findAll({
    attributes: ["id"],
    where: { group_gameid: res },
  });
  if (data.length > 0) {
    getRandomGroupId(len);
  } else {
    return res;
  }
}

/**
 *
 * @param {String} token
 * @param {function} cb
 */
function verify_token(token, cb) {
  let data = {};
  jwt.verify(token, configs.jwt_secret, function (err, decoded) {
    if (err) {
      data = {};
      data.statuscode = globals.Failed;
      data.message = "Failed to authenticate token.";
      cb(data);
    } else {
      // if everything is good, save to request for use in other routes
      data.decoded = decoded;
      models.Users.findOne({
        attributes: ["status", "token"],
        where: {
          id: decoded.id,
        },
      })
        .then(function (user) {
          if (token == user.token) {
            if (
              (decoded.role && decoded.role == "Admin") ||
              (user && user.status == "active")
            ) {
              data.statuscode = globals.OK;
              data.id = decoded.id;
              cb(data);
            } else {
              data = {};
              data.statuscode = globals.Failed;
              data.message = globals.UNAUTHORIZED;
              data.alertmessage = globals.USER_DISABLED;
              cb(data);
            }
          } else {
            data = {};
            data.statuscode = globals.Failed;
            data.message = globals.UNAUTHORIZED;
            cb(data);
          }
        })
        .catch((error) => {
          data = {};
          data.statuscode = globals.Failed;
          data.message = globals.USER_DISABLED;
          cb(data);
        });
    }
  });
}


/**
 * To avoid run time error if json string is not proper.
 * @param {String/Object} data
 */

function parseJSONData(data) {
  try {
    return JSON.parse(data);
  } catch (error) {
    return data;
  }
}