const router = require('express').Router()
const categorias = require('../controllers/categorias.controller')
const Authorize = require('../middlewares/auth.middleware')

// GET: api/categorias
router.get('/', Authorize('Usuario,Administrador'), categorias.getAll)

// GET: api/categorias/5
router.get('/:id', Authorize('Usuario,Administrador'), categorias.get)

// POST: api/categorias
router.post('/', Authorize('Administrador'), ...categorias.categoriaValidator, (req, res, next) => {
	const { validationResult } = require('express-validator');
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
	next();
}, categorias.create)

// PUT: api/categorias/5
router.put('/:id', Authorize('Administrador'), ...categorias.categoriaValidator, (req, res, next) => {
	const { validationResult } = require('express-validator');
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
	next();
}, categorias.update)

// DELETE: api/categorias/5
router.delete('/:id', Authorize('Administrador'), categorias.delete)

module.exports = router