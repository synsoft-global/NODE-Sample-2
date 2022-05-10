"use strict";
module.exports = (sequelize, DataTypes) => {
  var User = sequelize.define(
    "Users",
    {
      id: {
        type: DataTypes.INTEGER,
        unique: true,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        isEmail: true,
      },
      isBetOn: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      emailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      emailVerificationCode: {
        type: DataTypes.STRING,
      },
      token: {
        type: DataTypes.STRING,
      },
      username: {
        type: DataTypes.STRING,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
      },
      vip_label: {
        type: DataTypes.STRING,
      },
      user_badge: {
        type: DataTypes.JSON,
        get() {
          return this.getDataValue("user_badge")
            ? this.getDataValue("user_badge")
            : this.getDataValue("user_badge");
        },
        set(val) {
          this.setDataValue("user_badge", val);
        },
      },
      coloruisettings: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      unlockColor: {
        type: DataTypes.JSON,
      },
      admin_assigned_label: {
        type: DataTypes.STRING,
      },
      mobile_number: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
        defaultValue: null,
      },
      nickname: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM,
        values: ["active", "pending", "deleted", "banned", "stand-by"],
        defaultValue: "active"
      },
      rank: {
        type: DataTypes.STRING,
        defaultValue: "No Rank",
      },
      broadcast_balances: {
        type: DataTypes.INTEGER,
      },
      chat_icon: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      seed: {
        type: DataTypes.INTEGER,
      },
      country_code: {
        type: DataTypes.STRING,
      },
      ip: {
        type: DataTypes.STRING,
      },
      country: {
        type: DataTypes.STRING,
      },
      two_fa_key: {
        type: DataTypes.STRING,
      },
      two_fa_enabled: {
        type: DataTypes.BOOLEAN,
      },
      isOnline: {
        type: DataTypes.BOOLEAN,
      },
      verify_hash_fp: {
        type: DataTypes.STRING,
      },
      referral_code: {
        type: DataTypes.STRING,
      },
      referred_id: {
        type: DataTypes.INTEGER,
      },
      last_claim_time: {
        type: DataTypes.BIGINT,
      },
      last_aff_claim_time: {
        type: DataTypes.BIGINT,
      },
      last_online_time: {
        type: DataTypes.BIGINT,
      },
      warn: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      timeout: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      mute: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ban: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      freezeTableName: true, // Model tableName will be the same as the model name
    }
  );
  User.associate = function (models) {
    User.belongsTo(models.MasterVipLables, {
      foreignKey: "vip_label",
      targetKey: "label",
      as: "UserVipLabel",
    });
    User.hasOne(models.UserMeta, {
      foreignKey: "user_id",
      as: "UserDetail",
    });
    User.hasMany(models.UserBalances, {
      foreignKey: "user_id",
      as: "Balances",
    });
    User.hasMany(models.Bets, {
      foreignKey: "user_id",
      as: "BetsOfUser",
    });
    User.hasMany(models.Fairness, {
      foreignKey: "user_id",
      as: "FarinessOfUser",
    });
    User.hasMany(models.Messages, {
      foreignKey: "user_id",
      as: "UserMessages",
    });
  };
  return User;
};
