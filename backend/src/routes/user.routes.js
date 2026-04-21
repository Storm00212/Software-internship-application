const router = require('express').Router();
const ctrl   = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/',        authorize('admin'), ctrl.getUsers);
router.get('/agents',  authorize('admin'), ctrl.getAgents);
router.post('/',       authorize('admin'), ctrl.createUser);
router.delete('/:id',  authorize('admin'), ctrl.deleteUser);

module.exports = router;
