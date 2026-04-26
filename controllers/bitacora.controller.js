const { bitacora, producto } = require('../models')
const ClaimTypes = require('../config/claimtypes')
const requestIp = require('request-ip')


const { body, validationResult } = require('express-validator');
let self = {}

self.bitacoraValidator = [
    body('accion', 'El campo {0} es obligatorio').not().isEmpty(),
    body('accion', 'El campo {0} debe tener máximo 255 caracteres').isLength({ max: 255 }),
    body('elementoid').optional({ nullable: true }).isLength({ max: 255 }),
    body('ip', 'El campo {0} es obligatorio').not().isEmpty(),
    body('ip', 'El campo {0} debe tener máximo 255 caracteres').isLength({ max: 255 }),
    body('usuario', 'El campo {0} es obligatorio').not().isEmpty(),
    body('usuario', 'El campo {0} debe tener máximo 255 caracteres').isLength({ max: 255 })
]

// GET: api/bitacora
self.getAll = async function (req, res, next) {
    let data = await bitacora.findAll({
        attributes: [['id', 'bitacoraId'], 'accion', 'elementoid', 'ip', 'usuario', 'fecha'],
        order: [['id', 'DESC']]
    })
    res.status(200).json(data)
}

// POST: api/bitacora/logout
self.registraLogout = async function (req, res, next) {
    try {
        const email = req.decodedToken?.[ClaimTypes.Name] || 'invitado'
        const rol = req.decodedToken?.[ClaimTypes.Role]
        const usuarioBitacora = rol === 'Administrador' ? email : 'invitado'
        const ip = requestIp.getClientIp(req)

        await bitacora.create({
            accion: 'usuario.logout',
            elementoid: email,
            ip: ip,
            usuario: usuarioBitacora,
            fecha: new Date()
        })

        res.status(204).send()
    } catch (error) {
        next(error)
    }
}

// POST: api/bitacora/compra
self.registraCompra = async function (req, res, next) {
    try {
        const { articulos, totalCompra } = req.body

        const total = Number(totalCompra)
        if (Number.isNaN(total) || total < 0)
            return await rechazaCompra(req, res, 400, 'El total de compra debe ser válido.', { totalCompra })

        let detalle = ''
        if (!Array.isArray(articulos) || articulos.length === 0)
            return await rechazaCompra(req, res, 400, 'La compra debe incluir al menos un producto.', { totalCompra })

        const detallesArticulos = []
        let totalCalculado = 0
        for (const [index, item] of articulos.entries()) {
            if (!Number.isInteger(item?.productoId) || item.productoId <= 0)
                return await rechazaCompra(req, res, 400, 'Cada producto debe incluir un id válido.', { indice: index, item })

            if (!Number.isInteger(item.cantidad) || item.cantidad <= 0)
                return await rechazaCompra(req, res, 400, 'La cantidad de cada articulo debe ser mayor a cero.', { indice: index, productoId: item.productoId, cantidad: item.cantidad })

            const productoActual = await producto.findByPk(item.productoId)
            if (!productoActual)
                return await rechazaCompra(req, res, 404, `No se encontró el producto con id ${item.productoId}. La compra fue cancelada.`, { indice: index, productoId: item.productoId })

            const precio = redondear2(Number(productoActual.precio))
            const subtotal = redondear2(precio * item.cantidad)
            const subtotalRecibido = Number(item.subtotal)
            if (Number.isNaN(subtotalRecibido) || redondear2(subtotalRecibido) !== subtotal)
                return await rechazaCompra(req, res, 400, `El subtotal del producto ${productoActual.titulo} no coincide.`, { indice: index, productoId: item.productoId, subtotalRecibido: item.subtotal, subtotalCalculado: subtotal })

            totalCalculado = redondear2(totalCalculado + subtotal)
            detallesArticulos.push(`Producto ${index + 1}: ${productoActual.titulo} | Cantidad: ${item.cantidad} | Precio: ${precio.toFixed(2)} | Subtotal: ${subtotal.toFixed(2)}`)
        }

        if (redondear2(total) !== totalCalculado)
            return await rechazaCompra(req, res, 400, 'El total de la compra no coincide con los subtotales.', { totalRecibido: total, totalCalculado })

        detalle = `${detallesArticulos.join('\n')}\n\nTotal compra: ${totalCalculado.toFixed(2)}`

        await req.bitacora('usuario.compra', detalle)
        res.status(204).send()
    } catch (error) {
        next(error)
    }
}

function redondear2(valor) {
    return Math.round((valor + Number.EPSILON) * 100) / 100
}

async function rechazaCompra(req, res, statusCode, message, detalle) {
    const detalleSerializado = typeof detalle === 'undefined'
        ? message
        : `${message} | Detalle: ${JSON.stringify(detalle)}`

    await req.bitacora('usuario.compra_invalida', detalleSerializado)
    return res.status(statusCode).json({ message })
}

module.exports = self