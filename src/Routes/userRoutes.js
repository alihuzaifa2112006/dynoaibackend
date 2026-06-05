const express = require('express');
const router = express.Router();
const { registerCompany, loginUser, getCompanyProfile, updateCompanyProfile, changePassword, deleteAccount } = require('../Controller/contUsers');
const { protect } = require('../middleware/middlewar');





router.post('/register', registerCompany);
router.post('/login', loginUser);


router.get('/profile/:cusUserId', protect, getCompanyProfile);
router.put('/profile/:cusUserId', protect, updateCompanyProfile);
router.put('/password/:cusUserId', protect, changePassword);
router.delete('/account/:cusUserId', protect, deleteAccount);

module.exports = router;