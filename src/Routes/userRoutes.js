const express = require('express');
const router = express.Router();
const { registerCompany, loginUser, getCompanyProfile, updateCompanyProfile, changePassword, deleteAccount, getAdminStats } = require('../Controller/contUsers');
const { protect, authorizeRoles } = require('../middleware/middlewar');





router.post('/register', registerCompany);
router.post('/login', loginUser);

router.get('/admin-stats', protect, authorizeRoles('Admin'), getAdminStats);

router.get('/profile/:cusUserId', protect, getCompanyProfile);
router.put('/profile/:cusUserId', protect, updateCompanyProfile);
router.put('/password/:cusUserId', protect, changePassword);
router.delete('/account/:cusUserId', protect, deleteAccount);

module.exports = router;