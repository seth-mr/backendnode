const fs = require("fs")
const requestip = require("request-ip");
const ClaimTypes = require("../config/claimtypes");

const errorHandler = (err, req, res, next) => {
    let message = 'No se ha podido procesar la petición. Inténtelo nuevamente más tarde.'
    const statusCode = err.statusCode || 500
    // Obtiene la IP de la petición
    const ip = requestip.getClientIp(req)

    // Se obtiene el mail del usuario actual
    let email = "Anónimo"
    if (req.decodedToken ){
        email = req.decodedToken[ClaimTypes.Name];
    }

    // Se guarda en un archivo de texto
    fs.appendFile('log/log.txt', new Date() + " - ${statusCode} - ${ip} - ${email} - ${(err.message || mensaje)}\n", err => {
        if (err){
            console.error(err);
        }
    });

    // Se envia el mensaje apropiado al usuario
    if (process.env.NODE_ENV === 'development') {
        message = err.message || message
        res.status(statusCode).json({
            status: statusCode,
            message: message,
            stack: err.stack
        })
    } else {
        res.status(statusCode).send({ message: message })
    }
}

module.exports = errorHandler