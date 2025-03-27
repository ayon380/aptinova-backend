const { DataTypes, Op } = require("sequelize");
const sequelize = require("../config/database");

const InvalidToken = sequelize.define("InvalidToken", {
  token: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

// Add a method to clean up expired tokens
InvalidToken.cleanup = async () => {
  await InvalidToken.destroy({
    where: {
      expiresAt: {
        [Op.lt]: new Date(),
      },
    },
  });
};

module.exports = InvalidToken;
