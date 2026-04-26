const router = require('express').Router()
const auth = require('../controllers/auth.controller')
const Authorize = require('../middlewares/auth.middleware')

// POST: api/auth
router.post('/', auth.login)

// POST: api/auth/registro
router.post('/registro', (req, res, next) => {
	// Validación estricta de registroPendiente
	const { nombre, email, rol, password, codigohash } = req.body;
	if (nombre && nombre.length > 255) return res.status(400).json({ message: 'El nombre no puede exceder 255 caracteres.' });
	if (rol && rol.length > 255) return res.status(400).json({ message: 'El rol no puede exceder 255 caracteres.' });
	if (email && email.length > 40) return res.status(400).json({ message: 'El email no puede exceder 40 caracteres.' });
	if (codigohash && codigohash.length > 60) return res.status(400).json({ message: 'El código hash no puede exceder 60 caracteres.' });
	next();
}, auth.requestRegistration)

// POST: api/auth/registro/verificar
router.post('/registro/verificar', auth.verifyRegistration)

// GET: api/auth/tiempo
router.get('/tiempo', Authorize('Usuario,Administrador'), auth.tiempo)

module.exports = router