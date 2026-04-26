const router = require('express').Router()
const archivos = require('../controllers/archivos.controller')
const Authorize = require('../middlewares/auth.middleware')
const upload = require('../middlewares/upload.middleware')

// GET: api/archivos
router.get('/', Authorize('Administrador'), archivos.getAll)

// GET: api/archivos/5
router.get('/:id', archivos.get)

// GET: api/archivos/5/detalle
router.get('/:id/detalle', Authorize('Administrador'), archivos.getDetalle)

// POST: api/archivos
router.post('/', upload.single("file"), Authorize('Administrador'), ...archivos.archivoValidator, (req, res, next) => {
	const { validationResult } = require('express-validator');
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
	next();
}, archivos.create)

// PUT: api/archivos/5
router.put('/:id', upload.single("file"), Authorize('Administrador'), ...archivos.archivoValidator, (req, res, next) => {
	const { validationResult } = require('express-validator');
	const errors = validationResult(req);
	if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
	next();
}, archivos.update)

// DELETE: api/archivos/5
router.delete('/:id', Authorize('Administrador'), archivos.delete)

module.exports = router