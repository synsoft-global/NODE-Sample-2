const Sequelize = require("sequelize");
const dbconfig = require("../victoria/csigesnpbbmgcasrbara");
const fs = require("fs");
const path = require("path");
module.exports = function (env) {
  const db = {};
  const databases = Object.keys(dbconfig);

  /** Add Databases**/
  for (let i = 0; i < databases.length; ++i) {
    let database = databases[i];
    let dbPath = dbconfig[database];
    db[database] = new Sequelize(
      dbPath.database,
      dbPath.username,
      dbPath.password,
      {
        //const sequelize = new Sequelize("diceGame", "root", "123456", {
        host: dbPath.host,
        // disable logging; default: console.log
        logging: false,
        //   dialect: 'mysql'|'mariadb'|'sqlite'|'postgres'|'mssql',
        dialect: "mysql",
        port: dbPath.port,
        pool: {
          max: 30,
          min: 2,
          acquire: 600 * 1000,
          idle: 20000,
        },
      }
    );
    db["sequelize"+i] = db[database]
  }

  const sequelize = db.database1;
  /**Add the Database Models**/
  //Add models from database1 folder
  fs.readdirSync(__dirname + "/database1")
    .filter(
      (file) =>
        file.indexOf(".") !== 0 &&
        file !== "index.js" &&
        file.slice(-3) === ".js"
    )
    .forEach((file) => {
      const model = db.database1.import(
        path.join(__dirname + "/database1", file)
      );
      db[model.name] = model;
    });

  // Add models from database2 folder

  fs.readdirSync(__dirname + "/database2")
    .filter(
      (file) =>
        file.indexOf(".") !== 0 &&
        file !== "index.js" &&
        file.slice(-3) === ".js"
    )
    .forEach((file) => {
      const model = db.database2.import(
        path.join(__dirname + "/database2", file)
      );
      db[model.name] = model;
    });

  Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
      db[modelName].associate(db);
    }
  });

  db.sequelize = sequelize;

  return db;
};
