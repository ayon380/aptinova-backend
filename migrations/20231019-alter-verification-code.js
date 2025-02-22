'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('VerificationCodes', 'userId', {
      type: Sequelize.UUID,
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('VerificationCodes', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  }
};
