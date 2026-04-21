const router     = require('express').Router();
const ctrl       = require('../controllers/field.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All field routes require authentication
router.use(authenticate);

router.get('/dashboard/stats', ctrl.getDashboardStats);
router.get('/',                ctrl.getFields);
router.get('/:id',             ctrl.getFieldById);
router.post('/',               authorize('admin'), ctrl.createField);
router.put('/:id',             authorize('admin'), ctrl.updateField);
router.delete('/:id',          authorize('admin'), ctrl.deleteField);

module.exports = router;
