'use strict';
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const AdministradorUUID = crypto.randomUUID();
    const UsuarioUUID = crypto.randomUUID();

    // Insertar roles
    await queryInterface.bulkInsert('rol', [
      { id: AdministradorUUID, nombre: 'Administrador', createdAt: new Date(), updatedAt: new Date() },
      { id: UsuarioUUID, nombre: 'Usuario', createdAt: new Date(), updatedAt: new Date() },
    ]);

    // Insertar usuarios
    await queryInterface.bulkInsert('usuario', [
      {
        id: crypto.randomUUID(),
        email: 'cuentadesoportea@gmail.com',
        passwordhash: await bcrypt.hash('Administrador1234@', 10),
        nombre: 'Seth Marquez',
        rolid: AdministradorUUID,
        protegido: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        email: 'cuentadesoportec@gmail.com',
        passwordhash: await bcrypt.hash('Usuario1234@', 10),
        nombre: 'Usuario seth',
        rolid: UsuarioUUID,
        protegido: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('usuario', null, {});
    await queryInterface.bulkDelete('rol', null, {});
  }
};
