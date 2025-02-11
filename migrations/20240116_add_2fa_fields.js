const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'twoFactorSecret', {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('Users', 'twoFactorEnabled', {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    });
    await queryInterface.addColumn('Users', 'refreshToken', {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('Users', 'twoFactorTempCode', {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('Users', 'twoFactorTempCodeExpiry', {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'twoFactorSecret');
    await queryInterface.removeColumn('Users', 'twoFactorEnabled');
    await queryInterface.removeColumn('Users', 'refreshToken');
    await queryInterface.removeColumn('Users', 'twoFactorTempCode');
    await queryInterface.removeColumn('Users', 'twoFactorTempCodeExpiry');
  }
};
