const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: false,
        message: 'Token missing or invalid'
      });
    }
    console.log("authHeader", authHeader);

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: 'Invalid or expired token'
    });
  }
};