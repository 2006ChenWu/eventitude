const eventController = require('../controllers/event.server.controllers');

// 中间件 - 用于验证用户身份（复用用户路由中的中间件）
const authenticateUser = async (req, res, next) => {
  try {
    // 关键修改：支持多种头部格式
    const authHeader = req.headers['x-authorization'] || 
                      req.headers['X-Authorization'] || 
                      req.headers['authorization'];
    
    console.log('Event auth - Headers:', req.headers);
    console.log('Event auth - Auth header:', authHeader);
    
    if (!authHeader) {
      return res.status(401).json({
        error_message: 'Unauthorized - No valid token provided'
      });
    }

    // 支持两种格式 - 带Bearer前缀和不带前缀
    let sessionToken = authHeader;
    if (authHeader.startsWith('Bearer ')) {
      sessionToken = authHeader.split(' ')[1];
    }
    
    // 清理token
    sessionToken = sessionToken.toString().trim();
    console.log('Event auth - Session token:', sessionToken);

    const User = require('../models/user.server.models');
    const user = await User.findBySessionToken(sessionToken);
    
    console.log('Event auth - User found:', user);
    
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
    console.error('Event auth - Authentication error:', error);
    res.status(401).json({
      error_message: 'Unauthorized'
    });
  }
};

// 可选认证的中间件 - 新增这个中间件
const optionalAuthenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers['x-authorization'] || 
                      req.headers['X-Authorization'] || 
                      req.headers['authorization'];
    
    console.log('Event optional auth - Headers:', req.headers);
    console.log('Event optional auth - Auth header:', authHeader);
    
    if (!authHeader) {
      // 没有token，继续处理但不设置用户
      req.user = null;
      return next();
    }

    // 支持两种格式 - 带Bearer前缀和不带前缀
    let sessionToken = authHeader;
    if (authHeader.startsWith('Bearer ')) {
      sessionToken = authHeader.split(' ')[1];
    }
    
    // 清理token
    sessionToken = sessionToken.toString().trim();
    console.log('Event optional auth - Session token:', sessionToken);

    const User = require('../models/user.server.models');
    const user = await User.findBySessionToken(sessionToken);
    
    console.log('Event optional auth - User found:', user);
    
    if (user) {
      req.user = {
        userId: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email
      };
    } else {
      req.user = null;
    }
    next();
  } catch (error) {
    console.error('Event optional auth - Authentication error:', error);
    // 认证出错时也不阻止请求，只是不设置用户
    req.user = null;
    next();
  }
};

// 导出函数，接受 app 参数
module.exports = function(app) {
  // 创建新事件 - 需要认证
  app.post('/events', authenticateUser, eventController.createEvent);
  
  // 获取单个事件详情 - 使用可选认证
  app.get('/event/:event_id', optionalAuthenticateUser, eventController.getEvent);
  
  // 注册参加活动 - 需要认证
  app.post('/event/:event_id', authenticateUser, eventController.attendEvent);
  
  // 删除/归档活动 - 需要认证
  app.delete('/event/:event_id', authenticateUser, eventController.deleteEvent);
  
  // 更新活动 - 需要认证
  app.patch('/event/:event_id', authenticateUser, eventController.updateEvent);
  
  // 搜索活动 - 不需要认证
  app.get('/search', optionalAuthenticateUser, eventController.searchEvents);
};