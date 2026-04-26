const router = require('express').Router()
const usuarios = require('../controllers/usuarios.controller')
const Authorize = require('../middlewares/auth.middleware')

// GET: api/usuarios
router.get('/', Authorize('Administrador'), usuarios.getAll)

// GET: api/usuarios/email
router.get('/:email', Authorize('Administrador'), usuarios.get)

// POST: api/usuarios
router.post('/', Authorize('Administrador'), (req, res, next) => {
	try {
		// Validación estricta de usuario
		const { nombre, apellido, email, password, confirmPassword, rol } = req.body;
		if (nombre && nombre.length > 255) return res.status(400).json({ message: 'El nombre no puede exceder 255 caracteres.' });
		if (apellido && apellido.length > 255) return res.status(400).json({ message: 'El apellido no puede exceder 255 caracteres.' });
		if (rol && rol.length > 255) return res.status(400).json({ message: 'El rol no puede exceder 255 caracteres.' });
		if (email && email.length > 40) return res.status(400).json({ message: 'El email no puede exceder 40 caracteres.' });
		next();
	} catch (e) { next(e); }
}, usuarios.create)

// POST: api/usuarios/verificar
router.post('/verificar', Authorize('Administrador'), usuarios.verifyRegistration)

// PUT: api/usuarios/email
router.put('/:email', Authorize('Administrador'), usuarios.update)

// DELETE: api/usuarios/email
router.delete('/:email', Authorize('Administrador'), usuarios.delete)

module.exports = router