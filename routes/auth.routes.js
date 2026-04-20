const router = require('express').Router()
const auth = require('../controllers/auth.controller')
const Authorize = require('../middlewares/auth.middleware')

// POST: api/auth
router.post('/', auth.login)

// POST: api/auth/registro
router.post('/registro', auth.requestRegistration)

// POST: api/auth/registro/verificar
router.post('/registro/verificar', auth.verifyRegistration)

// GET: api/auth/tiempo
router.get('/tiempo', Authorize('Usuario,Administrador'), auth.tiempo)

module.exports = router