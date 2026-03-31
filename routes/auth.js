const express = require('express');
const router = express.Router();     
const User = require('../models/User');
const {register, login, getUserProfile} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// public routes
router.post('/register', register);
router.post('/login', login);

// routes needen token 
router.get('/Myprofile',authMiddleware, getUserProfile);

module.exports = router;




