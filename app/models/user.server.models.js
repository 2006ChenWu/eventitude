const db = require('../../database');
const bcrypt = require('bcrypt');

const User = {
  /**
   * 创建新用户
   */
  create: async (userData) => {
    try {
      const { username, password, firstName, lastName } = userData;
      
      // 检查用户名（邮箱）是否已存在
      const existingUser = await new Promise((resolve, reject) => {
        db.get(
          'SELECT user_id FROM users WHERE email = ?',
          [username],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      
      if (existingUser) {
        throw new Error('Username already exists');
      }
      
      // 加密密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // 插入新用户
      const newUser = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO users (first_name, last_name, email, password) 
           VALUES (?, ?, ?, ?)`,
          [firstName, lastName, username, hashedPassword],
          function(err) {
            if (err) reject(err);
            else {
              resolve({
                userId: this.lastID,
                username: username,
                firstName: firstName,
                lastName: lastName,
                createdAt: new Date().toISOString()
              });
            }
          }
        );
      });
      
      return newUser;
      
    } catch (error) {
      console.error('Error in User.create:', error);
      throw error;
    }
  },

  /**
   * 根据用户名（邮箱）查找用户
   */
  findByUsername: (username) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT user_id, email, password, first_name, last_name, session_token FROM users WHERE email = ?',
        [username],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  /**
   * 根据用户ID查找用户
   */
  findById: (userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT user_id, email as username, first_name, last_name FROM users WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  /**
   * 验证用户密码
   */
  verifyPassword: async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
  },

  /**
   * 更新用户会话token（确保存储成功）
   */
  updateSessionToken: (userId, sessionToken) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET session_token = ? WHERE user_id = ?',
        [sessionToken, userId],
        function(err) {
          if (err) reject(err);
          else if (this.changes === 0) {
            reject(new Error('User not found or token not updated'));
          } else {
            resolve({ changes: this.changes });
          }
        }
      );
    });
  },

  /**
   * 根据会话token查找用户（精确匹配）
   */
findBySessionToken: (sessionToken) => {
  return new Promise((resolve, reject) => {
    // 添加详细的调试信息
    console.log('findBySessionToken - Searching for token:', sessionToken ? `${sessionToken.substring(0, 10)}...` : 'null');
    
    db.get(
      'SELECT user_id FROM users WHERE session_token = ?',
      [sessionToken],
      (err, row) => {
        if (err) {
          console.error('findBySessionToken - Database error:', err);
          reject(err);
        } else {
          console.log('findBySessionToken - Result:', row);
          resolve(row);
        }
      }
    );
  });
},

  /**
   * 清除用户会话token（确保清除成功）
   */
  clearSessionToken: (userId) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET session_token = NULL WHERE user_id = ?',
        [userId],
        function(err) {
          if (err) reject(err);
          else if (this.changes === 0) {
            reject(new Error('User not found or token already cleared'));
          } else {
            resolve({ changes: this.changes });
          }
        }
      );
    });
  }
};

module.exports = User;