const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
    let token;

    // Check karo ke Authorization header aaya hai aur usme "Bearer" likha hai
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {

            token = req.headers.authorization.split(' ')[1];


            const decoded = jwt.verify(token, process.env.JWT_SECRET);


            req.user = decoded;


            next();
        } catch (error) {
            console.error("❌ Token Verification Failed:", error.message);
            return res.status(401).json({ message: "Not authorized, token failed" });
        }
    }


    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token provided" });
    }
};


const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        // req.user humein pichle 'protect' middleware se milega
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Forbidden: Role '${req.user?.role || 'Unknown'}' is not allowed to access this resource`
            });
        }
        next();
    };
};


module.exports = { protect, authorizeRoles };
