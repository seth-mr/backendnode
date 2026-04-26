const router = require('express').Router()
const bitacora = require('../controllers/bitacora.controller')
const Authorize = require('../middlewares/auth.middleware')

// GET: api/bitacora
router.get('/', Authorize('Administrador'), bitacora.getAll)
router.post('/logout', Authorize('Administrador,Usuario'), ...bitacora.bitacoraValidator, (req, res, next) => {
	const { validationResult } = require('express-validator');
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
	next();
}, bitacora.registraLogout)
router.post('/compra', Authorize('Usuario'), ...bitacora.bitacoraValidator, (req, res, next) => {
	const { validationResult } = require('express-validator');
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
	next();
}, bitacora.registraCompra)

module.exports = router