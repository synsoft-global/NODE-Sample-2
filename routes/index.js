var config = require("../config");

module.exports = function(env) {
  if (!env) {
    env = config.env || "test";
  }

  var routes = {};
  var models = require("../models")(env);
  var fs = require("fs");
  fs
    .readdirSync(__dirname)
    .filter(function(file) {
      return file.indexOf(".") !== 0 && file !== "index.js";
    })
    .forEach(function(file) {
      var cd = file.replace(".js", "");
      routes[cd] = require("./" + file)(models);
    });

  return routes;
};
