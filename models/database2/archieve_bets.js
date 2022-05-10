"use strict";
module.exports = (sequelize, DataTypes) => {
  const Archive_bets = sequelize.define(
    "Archive_bets",
    {
      id: {
        type: DataTypes.INTEGER,
        unique: true,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(65, 10),
      },
      currency: {
        type: DataTypes.STRING,
      },
      currency_id: {
        type: DataTypes.INTEGER,
      },
      nonce: {
        type: DataTypes.INTEGER,
      },
      game_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      fairness_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      fiat_value: {
        type: DataTypes.DECIMAL(65, 10),
      },
      payoutMultiplier: {
        type: DataTypes.DECIMAL(65, 4),
        // type: DataTypes.DECIMAL(10,2)
      },
      payout: {
        type: DataTypes.DECIMAL(65, 4),
        // type: DataTypes.DECIMAL(10,4)
      },
      serverSeedHash: {
        type: DataTypes.STRING,
      },
      clientSeed: {
        type: DataTypes.STRING,
      },
      group_gameid: {
        type: DataTypes.STRING,
      },
      username: {
        type: DataTypes.STRING,
      },
      win: {
        type: DataTypes.BOOLEAN,
      },
      // losse: {
      //   type: DataTypes.BOOLEAN,
      // },
      stateDice: {
        type: DataTypes.JSON,
      },
      // processed: {
      //   type: DataTypes.ENUM,
      //   values: ["0", "1"],
      //   defaultValue: "0",
      // },
      side: {
        type: DataTypes.ENUM,
        values: ["heads", "tails"],
      },
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
    }
  );
  // Archive_bets.associate = function (models) {
  //   Archive_bets.belongsTo(models.Users, {
  //     foreignKey: "user_id",
  //     targetKey: "id",
  //     as: "UserBets",
  //   });
  //   Archive_bets.belongsTo(models.MasterCurrency, {
  //     foreignKey: "currency_id",
  //     targetKey: "id",
  //     as: "BetCurrency",
  //   });
  //   Archive_bets.belongsTo(models.Fairness, {
  //     foreignKey: "fairness_id",
  //     targetKey: "id",
  //     as: "BetFairness",
  //   });
  // };
  return Archive_bets;
};
