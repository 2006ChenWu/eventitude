const db = require('../../database');

const Event = {
  /**
   * 创建新事件
   */
  create: async (eventData, creatorId) => {
    return new Promise((resolve, reject) => {
      const { name, description, location, startDate, closeRegistration, maxAttendees } = eventData;
      
      console.log('Event.create - Inserting event:', {
        name, description, location, startDate, closeRegistration, maxAttendees, creatorId
      });

      db.run(
        `INSERT INTO events (name, description, location, start_date, close_registration, max_attendees, creator_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, description, location, startDate, closeRegistration, maxAttendees, creatorId],
        function(err) {
          if (err) {
            console.error('Event.create - Database error:', err);
            reject(err);
          } else {
            console.log('Event.create - Event inserted with ID:', this.lastID);
            resolve({
              eventId: this.lastID,
              name: name,
              description: description,
              location: location,
              startDate: startDate,
              closeRegistration: closeRegistration,
              maxAttendees: maxAttendees,
              creatorId: creatorId
            });
          }
        }
      );
    });
  },

  /**
   * 根据ID查找事件
   */
  findById: (eventId) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT e.*, u.first_name, u.last_name, u.email 
         FROM events e 
         JOIN users u ON e.creator_id = u.user_id 
         WHERE e.event_id = ?`,
        [eventId],
        (err, row) => {
          if (err) {
            console.error('Event.findById - Database error:', err);
            reject(err);
          } else {
            console.log('Event.findById - Found event:', row);
            resolve(row);
          }
        }
      );
    });
  },

  /**
   * 获取事件的参加人数
   */
  getAttendeeCount: (eventId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM attendees WHERE event_id = ?', [eventId], (err, row) => {
            if (err) {
                console.error('Event.getAttendeeCount - Error:', err);
                reject(err);
            } else {
                console.log(`Event.getAttendeeCount - Event ID: ${eventId} Count: ${row.count}`);
                resolve(row.count);
            }
        });
    });
},

  /**
   * 获取事件的参加者列表（仅创建者可见）
   */
  getAttendees: (eventId) => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT 
                u.user_id,
                u.first_name,
                u.last_name,
                u.email
            FROM attendees a
            JOIN users u ON a.user_id = u.user_id
            WHERE a.event_id = ?
            
            UNION
            
            SELECT 
                u.user_id,
                u.first_name,
                u.last_name,
                u.email
            FROM events e
            JOIN users u ON e.creator_id = u.user_id
            WHERE e.event_id = ?
            
            ORDER BY user_id ASC
        `;
        
        db.all(sql, [eventId, eventId], (err, rows) => {
            if (err) {
                console.error('Event.getAttendees - Error:', err);
                reject(err);
            } else {
                console.log(`Event.getAttendees - Found ${rows.length} attendees for event ${eventId}`);
                resolve(rows);
            }
        });
    });
},

  /**
   * 检查用户是否已参加事件
   */
  isUserAttending: (eventId, userId) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT 1 FROM attendees WHERE event_id = ? AND user_id = ?',
      [eventId, userId],
      (err, row) => {
        if (err) {
          console.error('Event.isUserAttending - Database error:', err);
          reject(err);
        } else {
          console.log('Event.isUserAttending - Result:', !!row);
          resolve(!!row);
        }
      }
    );
  });
},

  /**
   * 注册参加事件
   */
  registerAttendee: (eventId, userId) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO attendees (event_id, user_id) VALUES (?, ?)',
        [eventId, userId],
        function(err) {
          if (err) {
            console.error('Event.registerAttendee - Database error:', err);
            reject(err);
          } else {
            console.log('Event.registerAttendee - Attendee registered');
            resolve({ changes: this.changes });
          }
        }
      );
    });
  },

  /**
   * 归档/删除事件
   */
  archiveEvent: (eventId, userId) => {
  return new Promise((resolve, reject) => {
    console.log('Archiving event:', eventId, 'by user:', userId);
    
    db.run(
      'UPDATE events SET close_registration = -1 WHERE event_id = ? AND creator_id = ?',
      [eventId, userId],
      function(err) {
        if (err) {
          console.error('Event.archiveEvent - Database error:', err);
          reject(err);
        } else {
          console.log('Event.archiveEvent - Event archived, changes:', this.changes);
          resolve({ changes: this.changes });
        }
      }
    );
  });
},

  /**
   * 更新事件
   */
  update: (eventId, userId, eventData) => {
    return new Promise((resolve, reject) => {
      const { name, description, location, startDate, closeRegistration, maxAttendees } = eventData;
      
      db.run(
        `UPDATE events 
         SET name = ?, description = ?, location = ?, start_date = ?, close_registration = ?, max_attendees = ?
         WHERE event_id = ? AND creator_id = ?`,
        [name, description, location, startDate, closeRegistration, maxAttendees, eventId, userId],
        function(err) {
          if (err) {
            console.error('Event.update - Database error:', err);
            reject(err);
          } else {
            console.log('Event.update - Event updated, changes:', this.changes);
            resolve({ changes: this.changes });
          }
        }
      );
    });
  },

  /**
   * 搜索事件
   */
  search: (filters, userId) => {
  return new Promise((resolve, reject) => {
    try {
      let query = `
        SELECT e.*, u.first_name, u.last_name, 
               (SELECT COUNT(*) FROM attendees a WHERE a.event_id = e.event_id) as attendee_count,
               EXISTS(SELECT 1 FROM attendees a WHERE a.event_id = e.event_id AND a.user_id = ?) as is_attending
        FROM events e
        JOIN users u ON e.creator_id = u.user_id
        WHERE 1=1
      `;
      let params = [userId];

      const now = Math.floor(Date.now() / 1000);
      console.log('Current time for search:', now);

      // 状态过滤逻辑
      if (filters.status === 'MY_EVENTS') {
        console.log('Filtering by MY_EVENTS for user:', userId);
        query += ' AND e.creator_id = ?';
        params.push(userId);
      } else if (filters.status === 'ATTENDING') {
        console.log('Filtering by ATTENDING for user:', userId);
        query += ' AND EXISTS(SELECT 1 FROM attendees a WHERE a.event_id = e.event_id AND a.user_id = ?)';
        params.push(userId);
      } else if (filters.status === 'OPEN') {
        console.log('Filtering by OPEN events');
        query += ' AND e.close_registration != -1 AND e.close_registration > ?';
        params.push(now);
      } else if (filters.status === 'ARCHIVE') {
        console.log('Filtering by ARCHIVE events');
        query += ' AND (e.close_registration = -1 OR e.close_registration <= ?)';
        params.push(now);
      } 
      // 移除了默认排除归档事件的逻辑
      // 当没有状态过滤时，应该返回所有事件（包括归档的）

      // 搜索关键词
      if (filters.q) {
        console.log('Adding search filter for:', filters.q);
        query += ' AND (e.name LIKE ? OR e.description LIKE ? OR e.location LIKE ?)';
        const searchTerm = `%${filters.q}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // 排序和分页
      query += ' ORDER BY e.start_date ASC';
      
      // 添加分页参数，设置默认值
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      console.log('Event.search - Final Query:', query);
      console.log('Event.search - Final Params:', params);

      db.all(query, params, (err, rows) => {
        if (err) {
          console.error('Event.search - Database error:', err);
          console.error('Event.search - Error stack:', err.stack);
          reject(err);
        } else {
          console.log('Event.search - Found events:', rows.length);
          resolve(rows || []);
        }
      });
    } catch (error) {
      console.error('Event.search - Unexpected error:', error);
      reject(error);
    }
  });
},
};

module.exports = Event;