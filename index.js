const express = require('express')
const cors = require("cors")
const dotenv = require('dotenv')
const app = express()

// Primero carga la configuración del archivo .env para que este disponible en las demás llamadas
dotenv.config()

// Se requiere para entender los datos recibidos en JSON
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// Se requiere si se accede desde un navegador web
var corsOptions = {
    origin: ["http://localhost:8080", "http://localhost:8081"],
    methods: "GET,PUT,POST,DELETE",
}
app.use(cors(corsOptions))

// Swagger
const swaggerUi = require('swagger-ui-express')
const swaggerFile = require('./swagger-output.json')
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerFile))

// Bitacora
app.use(require('./middlewares/bitacora.middleware'))

// Rutas
app.use("/api/categorias", require('./routes/categorias.routes'))
app.use("/api/productos", require('./routes/productos.routes'))
app.use("/api/usuarios", require('./routes/usuarios.routes'))
app.use("/api/roles", require('./routes/roles.routes'))
app.use("/api/auth", require('./routes/auth.routes'))
app.use("/api/archivos", require('./routes/archivos.routes'))
app.use("/api/bitacora", require('./routes/bitacora.routes'))
app.use((req, res) => { res.status(404).send("Recurso no encontrado") })
// Middleware para el manejo de errores (Debe ser el último middleware a utilizar)
const errorhandler = require('./middlewares/errorhandler.middleware')
app.use(errorhandler)

// Inicia el servidor web en el puerto SERVER_PORT
app.listen(process.env.SERVER_PORT, () => {
    console.log(`Aplicación de ejemplo escuchando en el puerto ${process.env.SERVER_PORT}`)
})