'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('registroPendiente', 'rol', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Usuario'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('registroPendiente', 'rol');
  }
};