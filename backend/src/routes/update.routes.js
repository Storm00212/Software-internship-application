const router = require('express').Router();
const ctrl   = require('../controllers/update.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/',                   ctrl.createUpdate);
router.get('/recent',              authorize('admin'), ctrl.getRecentUpdates);
router.get('/field/:fieldId',      ctrl.getFieldUpdates);

module.exports = router;
