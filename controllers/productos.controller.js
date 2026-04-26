const { producto, categoria, Sequelize } = require('../models');
const { body, validationResult } = require('express-validator');
const Op = Sequelize.Op

let self = {}

self.productoValidator = [
    body('titulo', 'El campo {0} es obligatorio').not().isEmpty(),
    body('titulo', 'El campo {0} debe tener máximo 255 caracteres').isLength({ max: 255 }),
    body('descripcion', 'El campo {0} es obligatorio').not().isEmpty(),
    body('descripcion', 'El campo {0} debe tener máximo 2000 caracteres').isLength({ max: 2000 }),
    body('precio', 'El campo {0} es obligatorio').not().isEmpty(),
    body('precio', 'El campo {0} debe ser un decimal válido').isDecimal({ force_decimal: false, decimal_digits: '0,2' }),
    body('precio', 'El campo {0} debe estar entre 0.01 y 99999999.99').isFloat({ min: 0.01, max: 99999999.99 }),
    body('archivoid').optional({ nullable: true }).isInt({ min: 1 }).withMessage('El campo archivoid debe ser un entero positivo'),
]

// GET: api/productos
self.getAll = async function (req, res, next) {
    try {
        // Recibe el parametro de busqueda
        const { s } = req.query

        // Filtro para buscar
        const filters = {}
        if (s) {
            filters.titulo = {
                [Op.like]: `%${s}%`
            }
        }

        let data = await producto.findAll({
            where: filters,
            attributes: [['id', 'productoId'], 'titulo', 'descripcion', 'precio', 'archivoid'],
            include: [{
                model: categoria,
                as: 'categorias',
                attributes: [['id', 'categoriaId'], 'nombre', 'protegida'],
                through: { attributes: [] }
            }],
            subQuery: false
        })
        return res.status(200).json(data)
    } catch (error) {
        next(error)
    }
}

// GET: api/productos/5
self.get = async function (req, res, next) {
    try {
        let id = req.params.id
        let data = await producto.findByPk(id, {
            attributes: [['id', 'productoId'], 'titulo', 'descripcion', 'precio', 'archivoid'],
            include: [{
                model: categoria,
                as: 'categorias',
                attributes: [['id', 'categoriaId'], 'nombre', 'protegida'],
                through: { attributes: [] }
            }]
        })
        if (data)
            res.status(200).json(data)
        else
            res.status(404).send()
    } catch (error) {
        next(error)
    }
}
// POST: api/productos
self.create = async function (req, res, next) {
    try {
        const errors = validationResult(req)
        if (!errors.isEmpty()) throw new Error(JSON.stringify(errors));

        let data = await producto.create({
            titulo: req.body.titulo,
            descripcion: req.body.descripcion,
            precio: req.body.precio,
            archivoid: req.body.archivoid || null
        })
        // Bitacora
        req.bitacora("producto.crear", data.id)
        res.status(201).json(data)
    } catch (error) {
        next(error)
    }
}
// PUT: api/productos/5
self.update = async function (req, res, next) {
    try {
        const errors = validationResult(req)
        if (!errors.isEmpty()) throw new Error(JSON.stringify(errors));

        let id = req.params.id
        let body = req.body
        let data = await producto.update(body, { where: { id: id } })
        if (data[0] === 0)
            return res.status(404).send()

        // Bitacora
        req.bitacora("producto.editar", id)
        res.status(204).send()
    } catch (error) {
        next(error)
    }
}
// DELETE: api/productos/5
self.delete = async function (req, res, next) {
    try {
        let id = req.params.id
        let data = await producto.findByPk(id)
        if (!data)
            return res.status(404).send()

        data = await producto.destroy({ where: { id: id } })
        if (data === 1) {
            // Bitacora
            req.bitacora("producto.eliminar", id)
            return res.status(204).send()
        }
        res.status(404).send()
    } catch (error) {
        next(error)
    }
}

// POST: api/productos/5/categoria
self.asignaCategoria = async function (req, res, next) {
    try {
        let itemToAssign = await categoria.findByPk(req.body.categoriaid);
        if (!itemToAssign) return res.status(404).send()

        let item = await producto.findByPk(req.params.id);
        if (!item) return res.status(404).send()

        await item.addCategoria(itemToAssign)
        // Bitacora
        req.bitacora("productocategoria.agregar", `${req.params.id}:${req.body.categoriaid}`)
        res.status(204).send()
    } catch (error) {
        next(error)
    }
}

// DELETE: api/productos/5/categoria/1
self.eliminaCategoria = async function (req, res, next) {
    try {
        let itemToRemove = await categoria.findByPk(req.params.categoriaid);
        if (!itemToRemove) return res.status(404).send()

        let item = await producto.findByPk(req.params.id);
        if (!item) return res.status(404).send()

        await item.removeCategoria(itemToRemove)
        // Bitacora
        req.bitacora("productocategoria.remover", `${req.params.id}:${req.params.categoriaid}`)
        res.status(204).send()
    } catch (error) {
        next(error)
    }
}

module.exports = self