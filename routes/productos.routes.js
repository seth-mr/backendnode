const router = require('express').Router()
const productos = require('../controllers/productos.controller')
const Authorize = require('../middlewares/auth.middleware')

// GET: api/productos
router.get('/', Authorize('Usuario,Administrador'), productos.getAll)

// GET: api/productos/5
router.get('/:id', Authorize('Usuario,Administrador'), productos.get)

// POST: api/productos
router.post('/', Authorize('Administrador'), ...productos.productoValidator, (req, res, next) => {
	const { validationResult } = require('express-validator');
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
	next();
}, productos.create)

// PUT: api/productos/5
router.put('/:id', Authorize('Administrador'), ...productos.productoValidator, (req, res, next) => {
	const { validationResult } = require('express-validator');
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
	next();
}, productos.update)

// DELETE: api/productos/5
router.delete('/:id', Authorize('Administrador'), productos.delete)

// POST: api/productos/5/categoria
router.post('/:id/categoria', Authorize('Administrador'), productos.asignaCategoria);

// DELETE: api/productos/5/categoria/1
router.delete('/:id/categoria/:categoriaid', Authorize('Administrador'), productos.eliminaCategoria);

module.exports = router