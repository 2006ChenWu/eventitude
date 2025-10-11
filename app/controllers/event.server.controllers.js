const Event = require('../models/event.server.models');
const Question = require('../models/question.server.models');

const eventController = {
  /**
   * 创建新事件 - POST /events
   */
  createEvent: async (req, res) => {
  try {
    console.log('=== EVENT CREATION START ===');
    console.log('Request body:', req.body);
    console.log('User from auth:', req.user);

    const { name, description, location, start, close_registration, max_attendees } = req.body;
    const userId = req.user.userId;

    console.log('Extracted fields:', {
      name, description, location, start, close_registration, max_attendees, userId
    });

    // 验证是否有额外字段
    const allowedFields = ['name', 'description', 'location', 'start', 'close_registration', 'max_attendees'];
    const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));
    if (extraFields.length > 0) {
      console.log('Extra fields detected:', extraFields);
      return res.status(400).json({
        error_message: 'Extra fields are not allowed'
      });
    }

    // 验证必填字段（包括max_attendees）
    const requiredFields = ['name', 'description', 'location', 'start', 'close_registration', 'max_attendees'];
    const missingFields = requiredFields.filter(field => !req.body[field] && req.body[field] !== 0);
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return res.status(400).json({
        error_message: 'All fields (name, description, location, start, close_registration, max_attendees) are required'
      });
    }

    console.log('All required fields present');

    // 验证字段不为空
    if (!name.trim() || !description.trim() || !location.trim()) {
      console.log('Blank fields detected');
      return res.status(400).json({
        error_message: 'Name, description, and location cannot be blank'
      });
    }

    // 验证时间逻辑
    const now = Math.floor(Date.now() / 1000);
    console.log('Current time:', now, 'Start time:', start, 'Close registration:', close_registration);
    
    // 验证时间格式和有效性
    if (isNaN(start) || isNaN(close_registration)) {
      console.log('Invalid time format');
      return res.status(400).json({
        error_message: 'Start and close_registration must be valid timestamps'
      });
    }

    // 关键修改：加强 close_registration 验证
    if (close_registration <= now) {
      console.log('Close registration is in the past or present');
      return res.status(400).json({
        error_message: 'Registration close time must be in the future'
      });
    }

    if (start <= now) {
      console.log('Start time is in the past');
      return res.status(400).json({
        error_message: 'Start time must be in the future'
      });
    }

    // 关键修改：更严格的 close_registration 验证
    if (close_registration >= start) {
      console.log('Close registration after or equal to start time');
      return res.status(400).json({
        error_message: 'Registration must close before the start time'
      });
    }

    // 验证max_attendees
    if (isNaN(max_attendees) || max_attendees < 1) {
      console.log('Invalid max_attendees:', max_attendees);
      return res.status(400).json({
        error_message: 'max_attendees must be a positive integer'
      });
    }

    console.log('All validation passed');

    // 创建事件
    console.log('Calling Event.create...');
    const newEvent = await Event.create({
      name,
      description,
      location,
      startDate: start,
      closeRegistration: close_registration,
      maxAttendees: max_attendees
    }, userId);

    console.log('Event created successfully:', newEvent);

    res.status(201).json({
      event_id: newEvent.eventId,
      name: newEvent.name,
      description: newEvent.description,
      location: newEvent.location,
      start: newEvent.startDate,
      close_registration: newEvent.closeRegistration,
      max_attendees: newEvent.maxAttendees,
      creator_id: newEvent.creatorId
    });

  } catch (error) {
    console.log('Event creation error:', error);
    console.log('Error stack:', error.stack);
    res.status(500).json({
      error_message: 'Internal server error: ' + error.message
    });
  }
},

  /**
   * 获取单个事件详情 - GET /event/{event_id}
   */
  getEvent: async (req, res) => {
    try {
        const eventId = parseInt(req.params.event_id);
        
        console.log('=== GET EVENT DETAILS ===');
        console.log('Request user object:', req.user);
        console.log(`Event ID: ${eventId}`);
        
        // 更健壮地获取用户ID
        let currentUserId = null;
        if (req.user) {
            // 尝试多种可能的属性名
            currentUserId = req.user.userId || req.user.user_id || req.user.id;
            console.log(`Current user ID found: ${currentUserId}`);
        } else {
            console.log('No user found in request');
        }
        
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // 获取参与人数
        const attendeeCount = await Event.getAttendeeCount(eventId);
        console.log(`Attendee count from table: ${attendeeCount}`);
        
        // 创建者自动计入参与者
        const numberAttending = attendeeCount + 1;
        console.log(`Total attending (including creator): ${numberAttending}`);

        // 获取问题列表
        const questions = await Question.getQuestionsByEvent(eventId);
        console.log(`Questions found: ${questions.length}`);

        // 构建基础响应对象
        const response = {
            event_id: event.event_id,
            name: event.name,
            description: event.description,
            location: event.location,
            start: event.start_date,
            close_registration: event.close_registration,
            max_attendees: event.max_attendees,
            number_attending: numberAttending,
            creator: {
                creator_id: event.creator_id,
                first_name: event.first_name,
                last_name: event.last_name,
                email: event.email
            },
            questions: questions
        };

        // 重要：只有当用户已认证且是事件创建者时才返回参与者列表
        console.log(`Current user ID: ${currentUserId}, Event creator ID: ${event.creator_id}`);
        
        if (currentUserId && currentUserId === event.creator_id) {
            console.log('User is event creator, fetching attendees...');
            const attendees = await Event.getAttendees(eventId);
            console.log(`Attendees list provided to creator: ${attendees.length}`);
            response.attendees = attendees;
        } else {
            console.log('User is not event creator, attendees list not included');
        }

        console.log('Final response has attendees:', 'attendees' in response);
        return res.status(200).json(response);
    } catch (error) {
        console.error('Get event details error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
},

  /**
   * 注册参加活动 - POST /event/{event_id}
   */
  attendEvent: async (req, res) => {
  try {
    console.log('=== EVENT REGISTRATION START ===');
    const eventId = parseInt(req.params.event_id);
    const userId = req.user.userId;

    console.log('Event ID:', eventId, 'User ID:', userId);

    if (isNaN(eventId)) {
      return res.status(400).json({
        error_message: 'Invalid event ID'
      });
    }

    const event = await Event.findById(eventId);
    console.log('Event found:', event);
    
    if (!event) {
      return res.status(404).json({
        error_message: 'Event not found'
      });
    }

    // 检查事件是否已归档（close_registration 为 -1）
    if (event.close_registration === -1) {
      console.log('Event is archived, registration not allowed');
      return res.status(403).json({
        error_message: 'Registration is closed'
      });
    }

    // 创建者自动被视为已注册
    if (event.creator_id === userId) {
      console.log('Creator is considered already registered');
      return res.status(403).json({
        error_message: 'You are already registered'
      });
    }

    // 检查用户是否已注册
    const isAttending = await Event.isUserAttending(eventId, userId);
    console.log('Is user already attending:', isAttending);
    
    if (isAttending) {
      return res.status(403).json({
        error_message: 'You are already registered'
      });
    }

    // 关键修改：容量检查包括创建者
    const attendeeCount = await Event.getAttendeeCount(eventId);
    console.log('Attendee count:', attendeeCount, 'Max attendees:', event.max_attendees);
    
    // 创建者自动占用一个名额
    const effectiveAttendeeCount = attendeeCount + 1;
    console.log('Effective attendee count (including creator):', effectiveAttendeeCount);
    
    if (event.max_attendees && effectiveAttendeeCount >= event.max_attendees) {
      console.log('Event is at capacity, cannot register');
      return res.status(403).json({
        error_message: 'Event is at capacity'
      });
    }

    // 检查注册是否已关闭（基于时间）
    const now = Math.floor(Date.now() / 1000);
    console.log('Current time:', now, 'Close registration time:', event.close_registration);
    
    if (event.close_registration !== -1 && event.close_registration < now) {
      return res.status(403).json({
        error_message: 'Registration is closed'
      });
    }

    // 注册参加活动
    console.log('Registering attendee...');
    await Event.registerAttendee(eventId, userId);

    res.status(200).json({
      message: 'Successfully registered for the event'
    });

  } catch (error) {
    console.log('Event registration error:', error);
    res.status(500).json({
      error_message: 'Internal server error'
    });
  }
},

  /**
   * 删除/归档活动 - DELETE /event/{event_id}
   */
  deleteEvent: async (req, res) => {
  try {
    console.log('=== EVENT ARCHIVE/DELETE START ===');
    const eventId = parseInt(req.params.event_id);
    const userId = req.user.userId;

    console.log('Event ID:', eventId, 'User ID:', userId);

    if (isNaN(eventId)) {
      return res.status(400).json({
        error_message: 'Invalid event ID'
      });
    }

    // 关键修改：先检查事件是否存在（包括已归档的事件）
    const event = await Event.findById(eventId);
    console.log('Event found:', event);
    
    if (!event) {
      return res.status(404).json({
        error_message: 'Event not found'
      });
    }

    // 检查权限：只有创建者可以归档事件
    if (event.creator_id !== userId) {
      return res.status(403).json({
        error_message: 'You can only delete your own events'
      });
    }

    // 关键修改：检查事件是否已经归档
    if (event.close_registration === -1) {
      console.log('Event already archived, returning success');
      return res.status(200).json({
        message: 'Event already archived'
      });
    }

    // 归档事件（将 close_registration 设置为 -1）
    console.log('Archiving event...');
    const result = await Event.archiveEvent(eventId, userId);
    
    if (result.changes === 0) {
      // 这通常不会发生，因为前面已经检查过权限和存在性
      return res.status(404).json({
        error_message: 'Event not found'
      });
    }

    console.log('Event archived successfully');
    res.status(200).json({
      message: 'Event successfully archived'
    });

  } catch (error) {
    console.log('Event archive error:', error);
    res.status(500).json({
      error_message: 'Internal server error'
    });
  }
},

  /**
   * 更新活动 - PATCH /event/{event_id}
   */
  updateEvent: async (req, res) => {
  try {
    console.log('=== EVENT UPDATE START ===');
    console.log('Request body:', req.body);
    console.log('User from auth:', req.user);

    const eventId = parseInt(req.params.event_id);
    const userId = req.user.userId;
    const { name, description, location, start, close_registration, max_attendees } = req.body;

    console.log('Event ID:', eventId, 'User ID:', userId);
    console.log('Extracted fields:', {
      name, description, location, start, close_registration, max_attendees
    });

    if (isNaN(eventId)) {
      return res.status(400).json({
        error_message: 'Invalid event ID'
      });
    }

    // 关键修改1：PATCH请求是部分更新，不要求所有字段都存在
    // 但如果有字段被提供，就必须验证它们

    // 验证额外字段
    const allowedFields = ['name', 'description', 'location', 'start', 'close_registration', 'max_attendees'];
    const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));
    if (extraFields.length > 0) {
      console.log('Extra fields detected:', extraFields);
      return res.status(400).json({
        error_message: 'Extra fields are not allowed'
      });
    }

    // 关键修改2：获取现有事件以验证权限和提供默认值
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        error_message: 'Event not found'
      });
    }

    if (event.creator_id !== userId) {
      return res.status(403).json({
        error_message: 'You can only update your own events'
      });
    }

    // 关键修改3：准备更新数据，使用现有值作为默认值
    const updateData = {
      name: name !== undefined ? name : event.name,
      description: description !== undefined ? description : event.description,
      location: location !== undefined ? location : event.location,
      startDate: start !== undefined ? start : event.start_date,
      closeRegistration: close_registration !== undefined ? close_registration : event.close_registration,
      maxAttendees: max_attendees !== undefined ? max_attendees : event.max_attendees
    };

    console.log('Update data with defaults:', updateData);

    // 关键修改4：只验证提供的字段，不要求所有字段都存在
    const now = Math.floor(Date.now() / 1000);

    // 如果提供了名称，验证它不为空
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({
        error_message: 'Name cannot be blank'
      });
    }

    // 如果提供了描述，验证它不为空
    if (description !== undefined && !description.trim()) {
      return res.status(400).json({
        error_message: 'Description cannot be blank'
      });
    }

    // 如果提供了位置，验证它不为空
    if (location !== undefined && !location.trim()) {
      return res.status(400).json({
        error_message: 'Location cannot be blank'
      });
    }

    // 如果提供了开始时间，验证它
    if (start !== undefined) {
      if (isNaN(start)) {
        return res.status(400).json({
          error_message: 'Start must be a valid timestamp'
        });
      }
      if (start <= now) {
        return res.status(400).json({
          error_message: 'Start time must be in the future'
        });
      }
    }

    // 如果提供了注册关闭时间，验证它
    if (close_registration !== undefined) {
      if (isNaN(close_registration)) {
        return res.status(400).json({
          error_message: 'Close registration must be a valid timestamp'
        });
      }
      if (close_registration <= now) {
        return res.status(400).json({
          error_message: 'Registration close time must be in the future'
        });
      }
    }

    // 验证时间关系（使用更新后的值或现有值）
    const effectiveStart = start !== undefined ? start : event.start_date;
    const effectiveClose = close_registration !== undefined ? close_registration : event.close_registration;
    
    if (effectiveClose >= effectiveStart) {
      return res.status(400).json({
        error_message: 'Registration must close before the start time'
      });
    }

    // 如果提供了最大参加人数，验证它
    if (max_attendees !== undefined) {
      if (isNaN(max_attendees) || max_attendees < 1) {
        return res.status(400).json({
          error_message: 'max_attendees must be a positive integer'
        });
      }
    }

    console.log('All validation passed for update');

    // 更新活动
    const result = await Event.update(eventId, userId, updateData);

    if (result.changes === 0) {
      return res.status(404).json({
        error_message: 'Event not found'
      });
    }

    res.status(200).json({
      message: 'Event successfully updated'
    });

  } catch (error) {
    console.log('Event update error:', error);
    res.status(500).json({
      error_message: 'Internal server error'
    });
  }
},

  /**
 * 搜索活动 - GET /search
 */
searchEvents: async (req, res) => {
  try {
    console.log('=== SEARCH EVENTS START ===');
    console.log('Query parameters:', req.query);
    console.log('User:', req.user);

    const { q, status, limit, offset } = req.query;
    
    // 关键修改：正确处理用户ID
    let userId = 0;
    if (req.user && req.user.userId) {
      userId = req.user.userId;
    }
    console.log('Effective user ID:', userId);

    // 验证limit和offset
    const parsedLimit = limit ? parseInt(limit) : 20;
    const parsedOffset = offset ? parseInt(offset) : 0;

    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({
        error_message: 'Limit must be between 1 and 100'
      });
    }

    if (isNaN(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({
        error_message: 'Offset must be non-negative'
      });
    }

    // 验证status参数
    const validStatuses = ['MY_EVENTS', 'ATTENDING', 'OPEN', 'ARCHIVE'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error_message: 'Status must be one of: MY_EVENTS, ATTENDING, OPEN, ARCHIVE'
      });
    }

    // 关键修改：对于 MY_EVENTS 和 ATTENDING 状态需要认证
    if (status === 'MY_EVENTS' || status === 'ATTENDING') {
      if (!req.user || !req.user.userId) {
        console.log('Authentication required for status:', status);
        return res.status(400).json({
          error_message: 'Authentication required for MY_EVENTS and ATTENDING status'
        });
      }
    }

    const filters = {
      q: q || null,
      status: status || null,
      limit: parsedLimit,
      offset: parsedOffset
    };

    console.log('Search filters:', filters, 'User ID:', userId);

    // 关键修改：添加更详细的错误处理
    let events;
    try {
      events = await Event.search(filters, userId);
      console.log('Events found:', events ? events.length : 0);
    } catch (searchError) {
      console.error('Event.search failed:', searchError);
      console.error('Search error stack:', searchError.stack);
      return res.status(500).json({
        error_message: 'Search operation failed: ' + searchError.message
      });
    }

    // 确保events是数组
    if (!Array.isArray(events)) {
      console.error('Events is not an array:', events);
      events = [];
    }

    // 格式化响应
    const formattedEvents = events.map(event => {
      // 确保每个事件都有必要的字段
      if (!event) return null;
      
      return {
        event_id: event.event_id,
        name: event.name,
        description: event.description,
        location: event.location,
        start: event.start_date,
        close_registration: event.close_registration,
        max_attendees: event.max_attendees,
        creator: {
          creator_id: event.creator_id,
          first_name: event.first_name,
          last_name: event.last_name
        },
        attendee_count: event.attendee_count || 0,
        is_attending: Boolean(event.is_attending)
      };
    }).filter(event => event !== null); // 过滤掉null值

    console.log('Formatted events count:', formattedEvents.length);
    
    // 直接返回数组
    res.status(200).json(formattedEvents);

  } catch (error) {
    console.error('Search events error:', error);
    console.error('Search events error stack:', error.stack);
    res.status(500).json({
      error_message: 'Internal server error: ' + error.message
    });
  }
},

};

module.exports = eventController;