'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class registroPendiente extends Model {}

  registroPendiente.init({
    id: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false
    },
    passwordhash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    codigohash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    expiracion: {
      type: DataTypes.DATE,
      allowNull: false
    },
    reenviodisponible: {
      type: DataTypes.DATE,
      allowNull: false
    },
    intentos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    freezeTableName: true,
    modelName: 'registroPendiente',
  });
  return registroPendiente;
};