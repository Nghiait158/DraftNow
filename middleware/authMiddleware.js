const jwt= require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => { 

    try{
        const authHeader = req.headers.authorization;
        if(!authHeader || !authHeader.startsWith('Bearer ')){
            return res.status(401).json({message: 'No token provided'});
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id: decoded.id,
        }

        next();

    }catch (error) {
        if(error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError'){   
            return res.status(401).json({message: 'Invalid or expired token'});

        }
        
        return res.status(500).json({message: 'Server error'});
    }

}
    module.exports = authMiddleware;