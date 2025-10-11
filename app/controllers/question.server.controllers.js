const Question = require('../models/question.server.models');

const questionController = {
  /**
   * 提问 - POST /event/{event_id}/question
   */
  askQuestion: async (req, res) => {
  try {
    console.log('=== ASK QUESTION START ===');
    const eventId = parseInt(req.params.event_id);
    const userId = req.user.userId;
    const { question } = req.body;

    console.log('Event ID:', eventId, 'User ID:', userId, 'Question:', question);
    console.log('Request body:', req.body);

    if (isNaN(eventId)) {
      return res.status(400).json({
        error_message: 'Invalid event ID'
      });
    }

    // 验证额外字段
    const allowedFields = ['question'];
    const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));
    if (extraFields.length > 0) {
      console.log('Extra fields detected:', extraFields);
      return res.status(400).json({
        error_message: 'Extra fields are not allowed'
      });
    }

    // 验证问题内容
    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        error_message: 'Question content is required'
      });
    }

    // 检查用户是否是活动创建者
    const isEventCreator = await Question.isUserEventCreator(eventId, userId);
    if (isEventCreator) {
      return res.status(403).json({
        error_message: 'You cannot ask questions on your own events'
      });
    }

    // 检查用户是否注册了活动
    const isRegistered = await Question.isUserRegisteredForEvent(eventId, userId);
    if (!isRegistered) {
      return res.status(403).json({
        error_message: 'You cannot ask questions on events you are not registered for'
      });
    }

    // 创建问题
    const newQuestion = await Question.create({ question }, eventId, userId);

    console.log('Question created successfully:', newQuestion);

    res.status(201).json({
      question_id: newQuestion.questionId
    });

  } catch (error) {
    console.error('Ask question error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error_message: 'Internal server error: ' + error.message
    });
  }
},

/**
 * 删除问题 - DELETE /question/{question_id}
 */
deleteQuestion: async (req, res) => {
  try {
    console.log('=== DELETE QUESTION START ===');
    const questionId = parseInt(req.params.question_id);
    const userId = req.user.userId;

    console.log('Question ID:', questionId, 'User ID:', userId);

    if (isNaN(questionId)) {
      return res.status(400).json({
        error_message: 'Invalid question ID'
      });
    }

    // 检查问题是否存在
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        error_message: 'Question not found'
      });
    }

    console.log('Question found:', question);

    // 检查权限：只有问题创建者或事件创建者可以删除
    const isQuestionCreator = (question.asked_by === userId);
    const isEventCreator = await Question.isUserEventCreator(question.event_id, userId);

    console.log('Permission check - isQuestionCreator:', isQuestionCreator, 'isEventCreator:', isEventCreator);

    if (!isQuestionCreator && !isEventCreator) {
      return res.status(403).json({
        error_message: 'You can only delete questions that you have authored, or for events that you have created'
      });
    }

    // 删除问题
    const result = await Question.delete(questionId, userId);

    if (result.changes === 0) {
      return res.status(404).json({
        error_message: 'Question not found'
      });
    }

    res.status(200).json({
      message: 'Question successfully deleted'
    });

  } catch (error) {
    console.error('Delete question error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error_message: 'Internal server error: ' + error.message
    });
  }
},

  /**
   * 投票给问题 - POST /question/{question_id}/vote
   */
  upvoteQuestion: async (req, res) => {
    try {
        // 修复：使用正确的参数名
        const questionId = parseInt(req.params.question_id);
        const currentUser = req.user;
        
        console.log(`=== UPVOTE QUESTION START ===`);
        console.log(`Question ID: ${questionId} User ID: ${currentUser.userId}`);
        
        if (isNaN(questionId)) {
            return res.status(400).json({ error: 'Invalid question ID' });
        }
        
        const result = await Question.addVote(questionId, currentUser.userId, 1);
        
        console.log(`Upvote successful`);
        return res.status(200).json({ message: 'Upvoted successfully' });
    } catch (error) {
        console.error(`Upvote question error:`, error);
        
        if (error.message === 'User has already voted on this question') {
            return res.status(403).json({ error: 'You have already voted on this question' });
        }
        
        return res.status(500).json({ error: 'Internal server error' });
    }
},

  /**
   * 取消投票 - DELETE /question/{question_id}/vote
   */
  downvoteQuestion: async (req, res) => {
    try {
        // 修复：使用正确的参数名
        const questionId = parseInt(req.params.question_id);
        const currentUser = req.user;
        
        console.log(`=== DOWNVOTE QUESTION START ===`);
        console.log(`Question ID: ${questionId} User ID: ${currentUser.userId}`);
        
        if (isNaN(questionId)) {
            return res.status(400).json({ error: 'Invalid question ID' });
        }
        
        // 对于 DELETE /vote，我们实现为下投票（添加 -1 票）
        const result = await Question.addVote(questionId, currentUser.userId, -1);
        
        console.log(`Downvote successful`);
        return res.status(200).json({ message: 'Downvoted successfully' });
    } catch (error) {
        console.error(`Downvote question error:`, error);
        
        if (error.message === 'User has already voted on this question') {
            return res.status(403).json({ error: 'You have already voted on this question' });
        }
        
        return res.status(500).json({ error: 'Internal server error' });
    }
},

  /**
   * 获取事件的问题列表（辅助功能）
   */
  getEventQuestions: async (req, res) => {
    try {
      const eventId = parseInt(req.params.event_id);

      if (isNaN(eventId)) {
        return res.status(400).json({
          error_message: 'Invalid event ID'
        });
      }

      const questions = await Question.getQuestionsByEvent(eventId);

      const formattedQuestions = questions.map(q => ({
        question_id: q.question_id,
        question: q.question,
        asked_by: {
          user_id: q.asked_by,
          first_name: q.first_name,
          last_name: q.last_name
        },
        votes: q.votes,
        event_id: q.event_id
      }));

      res.status(200).json({
        questions: formattedQuestions,
        total: formattedQuestions.length
      });

    } catch (error) {
      res.status(500).json({
        error_message: 'Internal server error'
      });
    }
  }
};

module.exports = questionController;