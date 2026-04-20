const bcrypt = require('bcrypt')
const crypto = require('crypto')
const { usuario, rol, registroPendiente, Sequelize } = require('../models')
const { GeneraToken, TiempoRestanteToken } = require('../services/jwttoken.service')
const { sendVerificationCode } = require('../services/email.service')

let self = {}

const CODIGO_EXPIRACION_MINUTOS = Number(process.env.REGISTRO_CODIGO_EXPIRACION_MINUTOS || 15)
const CODIGO_REENVIO_SEGUNDOS = Number(process.env.REGISTRO_CODIGO_REENVIO_SEGUNDOS || 60)
const CODIGO_MAX_INTENTOS = Number(process.env.REGISTRO_CODIGO_MAX_INTENTOS || 3)

const createHttpError = (statusCode, message) => {
    const error = new Error(message)
    error.statusCode = statusCode
    return error
}

const normalizaEmail = email => (email || '').trim().toLowerCase()

const generaCodigo = () => crypto.randomInt(10000, 100000).toString()

const generaHashCodigo = (email, codigo) => crypto
    .createHash('sha256')
    .update(`${normalizaEmail(email)}:${codigo}:${process.env.REGISTRO_CODIGO_SECRET || process.env.JWT_SECRET || 'registro-codigo'}`)
    .digest('hex')

const validaDatosRegistro = ({ nombre, apellido, email, password, confirmPassword }) => {
    if (!nombre || !apellido || !email || !password || !confirmPassword)
        throw createHttpError(400, 'Todos los campos son obligatorios.')

    const emailNormalizado = normalizaEmail(email)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailNormalizado))
        throw createHttpError(400, 'El correo electronico no es valido.')

    if (password.length < 6)
        throw createHttpError(400, 'La contrasena debe tener al menos 6 caracteres.')

    if (password !== confirmPassword)
        throw createHttpError(400, 'La confirmacion de contrasena no coincide.')
}

const obtieneRolUsuario = async () => {
    const rolUsuario = await rol.findOne({ where: { nombre: 'Usuario' } })
    if (!rolUsuario)
        throw createHttpError(500, 'No se encontro el rol Usuario configurado.')

    return rolUsuario
}

// POST: api/auth
self.login = async function (req, res, next) {
    const { email, password } = req.body

    try {
        let data = await usuario.findOne({
            where: { email: email },
            raw: true,
            attributes: ['id', 'email', 'nombre', 'passwordhash', [Sequelize.col('rol.nombre'), 'rol']],
            include: { model: rol, attributes: [] }
        })

        if (data === null)
            return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos.' })

        // Se compara la contraseña vs el hash almacenado
        const passwordMatch = await bcrypt.compare(password, data.passwordhash)
        if (!passwordMatch)
            return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos.' })

        // Utilizamos los nombres de Claims estandar
        token = GeneraToken(data.email, data.nombre, data.rol)

        // Bitacora
        req.bitacora("usuario.login", data.email)

        res.status(200).json({
            email: data.email,
            nombre: data.nombre,
            rol: data.rol,
            jwt: token
        })
    } catch (error) {
        next(error)
    }
}

// POST: api/auth/registro
self.requestRegistration = async function (req, res, next) {
    try {
        const { nombre, apellido, email, password, confirmPassword } = req.body
        validaDatosRegistro({ nombre, apellido, email, password, confirmPassword })

        const emailNormalizado = normalizaEmail(email)
        const usuarioExistente = await usuario.findOne({ where: { email: emailNormalizado } })
        if (usuarioExistente)
            return next(createHttpError(409, 'Ya existe una cuenta registrada con ese correo electronico.'))

        await obtieneRolUsuario()

        const ahora = new Date()
        const nombreCompleto = `${nombre}`.trim() + ' ' + `${apellido}`.trim()
        const registroExistente = await registroPendiente.findOne({ where: { email: emailNormalizado } })

        if (registroExistente && registroExistente.reenviodisponible > ahora)
            return next(createHttpError(429, 'Espera un momento antes de solicitar un nuevo codigo.'))

        const codigo = generaCodigo()
        const passwordHash = await bcrypt.hash(password, 10)
        const expiracion = new Date(ahora.getTime() + CODIGO_EXPIRACION_MINUTOS * 60000)
        const reenviodisponible = new Date(ahora.getTime() + CODIGO_REENVIO_SEGUNDOS * 1000)

        if (registroExistente) {
            const respaldo = {
                nombre: registroExistente.nombre,
                passwordhash: registroExistente.passwordhash,
                codigohash: registroExistente.codigohash,
                expiracion: registroExistente.expiracion,
                reenviodisponible: registroExistente.reenviodisponible,
                intentos: registroExistente.intentos
            }

            registroExistente.nombre = nombreCompleto.trim()
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

        await req.bitacora('usuario.registro.solicitar', emailNormalizado)

        res.status(202).json({
            email: emailNormalizado,
            message: 'Te enviamos un codigo de verificacion por correo electronico.'
        })
    } catch (error) {
        next(error)
    }
}

// POST: api/auth/registro/verificar
self.verifyRegistration = async function (req, res, next) {
    try {
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

        const rolUsuario = await obtieneRolUsuario()
        const creado = await usuario.create({
            id: crypto.randomUUID(),
            email: email,
            passwordhash: pendiente.passwordhash,
            nombre: pendiente.nombre,
            rolid: rolUsuario.id
        })

        await pendiente.destroy()
        await req.bitacora('usuario.registro.verificar', creado.email)

        res.status(201).json({
            message: 'Cuenta creada correctamente. Ya puedes iniciar sesion.'
        })
    } catch (error) {
        next(error)
    }
}

// GET: api/auth/tiempo
self.tiempo = async function (req, res) {
    const tiempo = TiempoRestanteToken(req)
    if (tiempo == null)
        res.status(404).send()

    res.status(200).send(tiempo)
}

module.exports = self