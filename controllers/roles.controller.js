const { rol } = require('../models')


const { body, validationResult } = require('express-validator');
let self = {}

self.rolValidator = [
    body('nombre', 'El campo {0} es obligatorio').not().isEmpty(),
    body('nombre', 'El campo {0} debe tener máximo 255 caracteres').isLength({ max: 255 })
]

// GET: api/roles
self.getAll = async function (req, res) {
    let data = await rol.findAll({ attributes: ['id', 'nombre'] })
    res.status(200).json(data)
}

module.exports = self