const express = require('express');
const router = express.Router();
const { registerCompany, loginUser } = require('../Controller/contUsers');



router.post('/register', registerCompany);

router.post('/login', loginUser);

module.exports = router;