
















};  }    });      type: Sequelize.INTEGER    await queryInterface.changeColumn('VerificationCodes', 'userId', {  async down(queryInterface, Sequelize) {  },    });      using: '"userId"::uuid'    }, {      allowNull: false      type: Sequelize.UUID,    await queryInterface.changeColumn('VerificationCodes', 'userId', {  async up(queryInterface, Sequelize) {module.exports = {'use strict';