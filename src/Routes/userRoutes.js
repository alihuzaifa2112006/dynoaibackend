const express = require('express');
const router = express.Router();
const { registerCompany, loginUser, getCompanyProfile } = require('../Controller/contUsers');
const { protect } = require('../middleware/middlewar');





router.post('/register', registerCompany);
router.post('/login', loginUser);


router.get('/profile', getCompanyProfile);

module.exports = router;