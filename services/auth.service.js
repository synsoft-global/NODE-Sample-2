
let env = "dev",
  models = require("../models/index")(env),
  _ = require("lodash"),
  Sequelize = require("sequelize");

/**
 * Update Model
 * @param {*} modelName contains name of any model
 * @param {*} update contains fairness model fields
 * @param {*} where contains fairness model fields
 */
 async function updateData(modelName, update, where) {
    return new Promise(function (resolve, reject) {
      models[modelName].update(update, { where: where }).then(function (updated) {
        resolve(updated);
      });
    });
  }

/**
 * Find Data
 * @param {*} modelName contains name of any model
 * @param {*} where contains fairness model fields
 */
 async function findAll(modelName, where) {
    return new Promise(function (resolve, reject) {
      models[modelName].findAll({ where: where }).then(function (result) {
        resolve(result);
      });
    });
  }

  /**
 * Increment in Model
 * @param {*} modelName contains name of any model
 * @param {*} update contains fairness model fields
 * @param {*} where contains fairness model fields
 */
async function incrementData(modelName, update, where) {
  return new Promise(function (resolve, reject) {
    models[modelName]
      .increment(update, { where: where })
      .then(function (updated) {
        resolve({ status: 1, updated });
      })
      .catch(function (error) {
        resolve({ status: 0, error });
      });
  });
}


  module.exports = {
    incrementData:incrementData,
    updateData: updateData,
    findAll:findAll
  }