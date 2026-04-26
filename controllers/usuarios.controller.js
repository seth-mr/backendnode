const { usuario, rol, Sequelize } = require('../models')
const bcrypt = require('bcrypt')
const crypto = require('crypto')

let self = {}

const CODIGO_EXPIRACION_MINUTOS = Number(process.env.REGISTRO_CODIGO_EXPIRACION_MINUTOS || 15)
const CODIGO_REENVIO_SEGUNDOS = Number(process.env.REGISTRO_CODIGO_REENVIO_SEGUNDOS || 60)
const CODIGO_MAX_INTENTOS = Number(process.env.REGISTRO_CODIGO_MAX_INTENTOS || 3)


const createHttpError = (statusCode, message) => {
    const error = new Error(message)
    error.statusCode = statusCode
    return error
}

const validaUsuarioCampos = ({ nombre, apellido, email, password, confirmPassword, rol }) => {
    if (!nombre || !apellido || !email || !password || !confirmPassword || !rol)
        throw createHttpError(400, 'Todos los campos son obligatorios.')
    if (nombre.length > 255) throw createHttpError(400, 'El nombre no puede exceder 255 caracteres.')
    if (apellido.length > 255) throw createHttpError(400, 'El apellido no puede exceder 255 caracteres.')
    if (rol.length > 255) throw createHttpError(400, 'El rol no puede exceder 255 caracteres.')
    if (email.length > 40) throw createHttpError(400, 'El email no puede exceder 40 caracteres.')
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email))
        throw createHttpError(400, 'El correo electronico no es valido.')
    if (password.length < 6)
        throw createHttpError(400, 'La contrasena debe tener al menos 6 caracteres.')
    if (password !== confirmPassword)
        throw createHttpError(400, 'La confirmacion de contrasena no coincide.')
}

const normalizaEmail = email => (email || '').trim().toLowerCase()

const generaCodigo = () => crypto.randomInt(10000, 100000).toString()

const generaHashCodigo = (email, codigo) => crypto
    .createHash('sha256')
    .update(`${normalizaEmail(email)}:${codigo}:${process.env.REGISTRO_CODIGO_SECRET || process.env.JWT_SECRET || 'registro-codigo'}`)
    .digest('hex')


// Sustituye la validación anterior por la nueva
const validaDatosRegistroAdmin = validaUsuarioCampos

// GET: api/usuarios
self.getAll = async function (req, res, next) {
    try {
        const data = await usuario.findAll({
            raw: true,
            attributes: ['id', 'email', 'nombre', [Sequelize.col('rol.nombre'), 'rol']],
            include: { model: rol, attributes: [] }
        })
        res.status(200).json(data)
    } catch (error) {
        next(error)
    }
}

// GET: api/usuarios/email
self.get = async function (req, res, next) {
    try {
        const email = req.params.email
        const data = await usuario.findOne({
            where: { email: email },
            raw: true,
            attributes: ['id', 'email', 'nombre', [Sequelize.col('rol.nombre'), 'rol']],
            include: { model: rol, attributes: [] }
        })
        if (data)
            return res.status(200).json(data)
        res.status(404).send()
    } catch (error) {
        next(error)
    }
}
// POST: api/usuarios
self.create = async function (req, res, next) {
    try {
        const { nombre, apellido, email, password, confirmPassword, rol: nombreRol } = req.body
        validaDatosRegistroAdmin({ nombre, apellido, email, password, confirmPassword, rol: nombreRol })

        const emailNormalizado = normalizaEmail(email)
        const rolusuario = await rol.findOne({ where: { nombre: nombreRol } })
        if (!rolusuario)
            return next(createHttpError(400, 'El rol seleccionado no es valido.'))

        const usuarioExistente = await usuario.findOne({ where: { email: emailNormalizado } })
        if (usuarioExistente)
            return next(createHttpError(409, 'Ya existe una cuenta registrada con ese correo electronico.'))

        const { registroPendiente } = require('../models')
        const ahora = new Date()
        const nombreCompleto = `${nombre}`.trim() + ' ' + `${apellido}`.trim()
        const registroExistente = await registroPendiente.findOne({ where: { email: emailNormalizado } })

        if (registroExistente && registroExistente.reenviodisponible > ahora)
            return next(createHttpError(429, 'Espera un momento antes de solicitar un nuevo codigo.'))

        const codigo = generaCodigo()
        const passwordHash = await bcrypt.hash(password, 10)
        const expiracion = new Date(ahora.getTime() + CODIGO_EXPIRACION_MINUTOS * 60000)
        const reenviodisponible = new Date(ahora.getTime() + CODIGO_REENVIO_SEGUNDOS * 1000)
        const { sendVerificationCode } = require('../services/email.service')

        if (registroExistente) {
            const respaldo = {
                nombre: registroExistente.nombre,
                rol: registroExistente.rol,
                passwordhash: registroExistente.passwordhash,
                codigohash: registroExistente.codigohash,
                expiracion: registroExistente.expiracion,
                reenviodisponible: registroExistente.reenviodisponible,
                intentos: registroExistente.intentos
            }

            registroExistente.nombre = nombreCompleto.trim()
            registroExistente.rol = nombreRol
            registroExistente.passwordhash = passwordHash
            registroExistente.codigohash = generaHashCodigo(emailNormalizado, codigo)
            registroExistente.expiracion = expiracion
            registroExistente.reenviodisponible = reenviodisponible
            registroExistente.intentos = 0
            await registroExistente.save()

            try {
                await sendVerificationCode(emailNormalizado, nombreCompleto.trim(), codigo, CODIGO_EXPIRACION_MINUTOS)
            } catch (error) {
                registroExistente.nombre = respaldo.nombre
                registroExistente.rol = respaldo.rol
                registroExistente.passwordhash = respaldo.passwordhash
                registroExistente.codigohash = respaldo.codigohash
                registroExistente.expiracion = respaldo.expiracion
                registroExistente.reenviodisponible = respaldo.reenviodisponible
                registroExistente.intentos = respaldo.intentos
                await registroExistente.save()
                throw error
            }
        } else {
            const nuevoRegistro = await registroPendiente.create({
                id: crypto.randomUUID(),
                email: emailNormalizado,
                nombre: nombreCompleto.trim(),
                rol: nombreRol,
                passwordhash: passwordHash,
                codigohash: generaHashCodigo(emailNormalizado, codigo),
                expiracion: expiracion,
                reenviodisponible: reenviodisponible,
                intentos: 0
            })

            try {
                await sendVerificationCode(emailNormalizado, nombreCompleto.trim(), codigo, CODIGO_EXPIRACION_MINUTOS)
            } catch (error) {
                await nuevoRegistro.destroy()
                throw error
            }
        }

        await req.bitacora('usuarios.registro.solicitar', `${emailNormalizado}:${nombreRol}`)
        res.status(202).json({
            email: emailNormalizado,
            message: 'Te enviamos un codigo de verificacion por correo electronico.'
        })
    } catch (error) {
        next(error)
    }
}

// POST: api/usuarios/verificar
self.verifyRegistration = async function (req, res, next) {
    try {
        const { registroPendiente } = require('../models')
        const email = normalizaEmail(req.body.email)
        const codigo = `${req.body.codigo || ''}`.trim()

        if (!email || !codigo)
            return next(createHttpError(400, 'Correo electronico y codigo son obligatorios.'))

        if (!/^\d{5}$/.test(codigo))
            return next(createHttpError(400, 'El codigo debe contener 5 digitos.'))

        const pendiente = await registroPendiente.findOne({ where: { email: email } })
        if (!pendiente)
            return next(createHttpError(404, 'No existe un registro pendiente para ese correo electronico.'))

        if (pendiente.expiracion < new Date()) {
            await pendiente.destroy()
            return next(createHttpError(410, 'El codigo ha expirado. Solicita uno nuevo.'))
        }

        if (pendiente.intentos >= CODIGO_MAX_INTENTOS) {
            await pendiente.destroy()
            return next(createHttpError(429, 'Se excedio el numero maximo de intentos. Solicita un nuevo codigo.'))
        }

        const codigoValido = pendiente.codigohash === generaHashCodigo(email, codigo)
        if (!codigoValido) {
            pendiente.intentos += 1
            await pendiente.save()
            return next(createHttpError(400, 'El codigo de verificacion no es valido.'))
        }

        const usuarioExistente = await usuario.findOne({ where: { email: email } })
        if (usuarioExistente) {
            await pendiente.destroy()
            return next(createHttpError(409, 'Ya existe una cuenta registrada con ese correo electronico.'))
        }

        const rolusuario = await rol.findOne({ where: { nombre: pendiente.rol } })
        if (!rolusuario)
            return next(createHttpError(500, 'No se encontro el rol configurado para el registro pendiente.'))

        const creado = await usuario.create({
            id: crypto.randomUUID(),
            email: email,
            passwordhash: pendiente.passwordhash,
            nombre: pendiente.nombre,
            rolid: rolusuario.id
        })

        await pendiente.destroy()
        await req.bitacora('usuarios.registro.verificar', `${creado.email}:${pendiente.rol}`)

        res.status(201).json({
            message: 'Cuenta creada correctamente. Ya puedes iniciar sesion.'
        })
    } catch (error) {
        next(error)
    }
}

// PUT: api/usuarios/email
self.update = async function (req, res, next) {
    try {
        const email = req.params.email
        const rolusuario = await rol.findOne({ where: { nombre: req.body.rol } })
        req.body.rolid = rolusuario.id

        const data = await usuario.update(req.body, {
            where: { email: email },
        })
        if (data[0] === 0)
            return res.status(404).send()
        // Bitacora
        req.bitacora("usuarios.editar", email)
        res.status(204).send()
    } catch (error) {
        next(error)
    }
}

// DELETE: api/usuarios/email
self.delete = async function (req, res, next) {
    try {
        const email = req.params.email
        let data = await usuario.findOne({ where: { email: email } })
        // No se pueden eliminar usuarios protegidos
        if (data.protegido) return res.status(403).send()

        data = await usuario.destroy({ where: { email: email } })
        if (data === 1) {
            // Bitacora
            req.bitacora("usuarios.eliminar", email)
            return res.status(204).send()  // Elemento eliminado
        }

        res.status(403).send()
    } catch (error) {
        next(error)
    }
}

module.exports = self