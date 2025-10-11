const User = require('../models/user.server.models');
const crypto = require('crypto');

const userController = {
  /**
   * 创建新用户 - 对应 POST /users
   */
  addUser: async (req, res) => {
    try {
      const { email, password, first_name, last_name } = req.body;

      // 验证必填字段
      if (!email || !password || !first_name || !last_name) {
        return res.status(400).json({
          error_message: 'All fields (email, password, first_name, last_name) are required'
        });
      }

      // 验证是否有额外字段
      const allowedFields = ['email', 'password', 'first_name', 'last_name'];
      const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));
      if (extraFields.length > 0) {
        return res.status(400).json({
          error_message: 'Extra fields are not allowed'
        });
      }

      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error_message: 'Email must be a valid email address'
        });
      }

      // 验证密码强度
      if (password.length < 8) {
        return res.status(400).json({
          error_message: 'Password must be at least 8 characters long'
        });
      }
      if (password.length > 30) {
        return res.status(400).json({
          error_message: 'Password must be no more than 30 characters long'
        });
      }
      const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,30}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          error_message: 'Password must contain at least one number, one uppercase letter, one lowercase letter, and one special character (!@#$%^&*)'
        });
      }

      // 创建用户
      const newUser = await User.create({
        username: email,
        password,
        firstName: first_name,
        lastName: last_name
      });

      res.status(201).json({
        user_id: newUser.userId,
        email: newUser.username,
        first_name: newUser.firstName,
        last_name: newUser.lastName,
        created_at: newUser.createdAt
      });

    } catch (error) {
      if (error.message === 'Username already exists') {
        return res.status(400).json({
          error_message: 'Username already exists'
        });
      }
      res.status(500).json({
        error_message: 'Internal server error: ' + error.message
      });
    }
  },

  /**
   * 用户登录 - 确保令牌存储与返回一致
   */
  /**
 * 用户登录 - 确保令牌存储与返回一致
 */
loginUser: async (req, res) => {
  try {
    const { email, password } = req.body;

    // 验证额外字段
    const allowedFields = ['email', 'password'];
    const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));
    if (extraFields.length > 0) {
      return res.status(400).json({ error_message: 'Extra fields are not allowed' });
    }

    // 验证必填字段
    if (!email || !password) {
      return res.status(400).json({ error_message: 'Email and password are required' });
    }

    // 查找用户（包含session_token）
    const user = await User.findByUsername(email);
    if (!user) {
      return res.status(400).json({ error_message: 'Invalid email or password' });
    }

    // 验证密码
    const isValidPassword = await User.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error_message: 'Invalid email or password' });
    }

    // 关键修改：检查是否已有有效token，如果有则复用
    let sessionToken = user.session_token;
    
    // 只有当没有token或token无效时才生成新token
    if (!sessionToken) {
      sessionToken = crypto.randomBytes(32).toString('hex');
      console.log('Login - Generated new token:', sessionToken.substring(0, 10) + '...');
      await User.updateSessionToken(user.user_id, sessionToken);
    } else {
      console.log('Login - Reusing existing token:', sessionToken.substring(0, 10) + '...');
    }

    // 返回与数据库中存储一致的令牌
    res.status(200).json({
      user_id: user.user_id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      session_token: sessionToken
    });

  } catch (error) {
    console.log('Login error:', error.message);
    res.status(500).json({ error_message: 'Internal server error: ' + error.message });
  }
},

  /**
   * 用户注销 - 确保令牌验证准确
   */
  /**
 * 用户注销 - 增强调试和健壮性
 */
logoutUser: async (req, res) => {
  try {
    console.log('=== LOGOUT CONTROLLER CALLED ===');
    console.log('User from middleware:', req.user);
    
    // 直接从中间件设置的 req.user 获取用户ID
    const userId = req.user.userId;
    
    // 清除令牌
    await User.clearSessionToken(userId);
    console.log('Token cleared for user:', userId);

    res.status(200).json({ message: 'Successfully logged out' });

  } catch (error) {
    console.log('Logout error:', error.message);
    res.status(500).json({ error_message: 'Internal server error: ' + error.message });
  }
}
};

module.exports = userController;