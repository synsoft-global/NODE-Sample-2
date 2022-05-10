const Config = {
  encription_key: "XXXXXXXXXXXX",
  pageSize: 10,
  Email_From: '"XXXX " <xxx@www.com>',
  Email_User: "xxx@www.com",
  Email_Password: "XXXXXXX",
  Email_Contact_Us: "testadmin@yopmail.com",
  sendEmail: true,
  Forgot_Password_link: "http://xxx.com/auth/verifyForgotPassword?",
  Verify_Email_link: "http://xxx.com/auth/login?",
  addressHookUrl: "http://test-api.eveongames.com/currency/deposit",
  TOKEN_EXPIRATION_TIME: 240 * 60 * 60, // 48 hours,
};

module.exports = Config;
