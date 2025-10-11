const questionController = require('../controllers/question.server.controllers');

// 中间件 - 用于验证用户身份
const authenticateUser = async (req, res, next) => {
  try {
    // 关键修改：支持多种头部格式，与事件路由保持一致
    const authHeader = req.headers['x-authorization'] || 
                      req.headers['X-Authorization'] || 
                      req.headers['authorization'];
    
    console.log('Question auth - Headers:', req.headers);
    console.log('Question auth - Auth header:', authHeader);
    
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
    console.log('Question auth - Session token:', sessionToken);

    const User = require('../models/user.server.models');
    const user = await User.findBySessionToken(sessionToken);
    
    console.log('Question auth - User found:', user);
    
    if (!user) {
      return res.status(401).json({
        error_message: 'Unauthorized - Invalid token'
      });
    }

    req.user = {
      userId: user.user_id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name
    };
    next();
  } catch (error) {
    console.error('Question auth - Authentication error:', error);
    res.status(401).json({
      error_message: 'Unauthorized'
    });
  }
};

// 导出函数，接受 app 参数
module.exports = function(app) {
  app.post('/event/:event_id/question', authenticateUser, questionController.askQuestion);
  app.delete('/question/:question_id', authenticateUser, questionController.deleteQuestion);
  app.post('/question/:question_id/vote', authenticateUser, questionController.upvoteQuestion);
  app.delete('/question/:question_id/vote', authenticateUser, questionController.downvoteQuestion);
  app.get('/event/:event_id/questions', questionController.getEventQuestions);
};