"use strict";

module.exports = (sequelize, DataTypes) => {
  var Log = sequelize.define(
    "Log",
    {
      id: {
        type: DataTypes.INTEGER,
        unique: true,
        autoIncrement: true,
        primaryKey: true,
      },
      application: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      error: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      other_detail: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
    }
  );
  return Log;
};
