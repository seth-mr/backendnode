'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('usuario', 'email', {
      type: Sequelize.STRING(40),
      allowNull: false,
      unique: true
    });

    await queryInterface.changeColumn('registroPendiente', 'email', {
      type: Sequelize.STRING(40),
      allowNull: false,
      unique: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('usuario', 'email', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    });

    await queryInterface.changeColumn('registroPendiente', 'email', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    });
  }
};