const nodemailer = require('nodemailer')

const smtpPort = Number(process.env.EMAIL_PORT || 587)
const secure = process.env.EMAIL_SECURE === 'true'

const getTransporter = () => {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || !process.env.EMAIL_FROM) {
        const error = new Error('La configuracion de correo no esta completa.')
        error.statusCode = 500
        throw error
    }

    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: smtpPort,
        secure: secure,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    })
}

const escapeHtml = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const sendVerificationCode = async (email, nombre, codigo, minutosExpiracion) => {
    const transporter = getTransporter()
    const nombreEscapado = escapeHtml(nombre)

    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Codigo de verificacion de cuenta',
        text: `Hola ${nombre},\n\nTu codigo de verificacion es ${codigo}.\nEste codigo expira en ${minutosExpiracion} minutos.\n\nSi no solicitaste esta cuenta, ignora este mensaje.`,
        html: `<p>Hola ${nombreEscapado},</p><p>Tu codigo de verificacion es <strong>${codigo}</strong>.</p><p>Este codigo expira en ${minutosExpiracion} minutos.</p><p>Si no solicitaste esta cuenta, ignora este mensaje.</p>`
    })
}

module.exports = {
    sendVerificationCode
}