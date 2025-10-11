const userController = require('../controllers/user.server.controllers');

// 中间件 - 用于验证用户身份
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers['x-authorization'] || req.headers['X-Authorization'];
    
    console.log('Auth header:', authHeader); // 调试
    
    if (!authHeader) {
      return res.status(401).json({
        error_message: 'Unauthorized - No valid token provided'
      });
    }

    // 修复：支持两种格式 - 带Bearer前缀和不带前缀
    let sessionToken = authHeader;
    if (authHeader.startsWith('Bearer ')) {
      sessionToken = authHeader.split(' ')[1];
    }
    
    console.log('Session token:', sessionToken); // 调试

    const User = require('../models/user.server.models');
    const user = await User.findBySessionToken(sessionToken);
    
    console.log('User found:', user); // 调试
    
    if (!user) {
      return res.status(401).json({
        error_message: 'Unauthorized - Invalid token'
      });
    }

    req.user = {
      userId: user.user_id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email
    };
    next();
  } catch (error) {
    console.log('Auth middleware error:', error); // 调试
    res.status(401).json({
      error_message: 'Unauthorized'
    });
  }
};

// 导出函数，接受 app 参数
module.exports = function(app) {
  app.post('/users', userController.addUser);
  app.post('/login', userController.loginUser);
  app.post('/logout', authenticateUser, userController.logoutUser);
};