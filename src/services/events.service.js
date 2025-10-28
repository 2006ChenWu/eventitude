import { apiService } from './api.service'

class EventsService {
  async getEvents(filters = {}) {
    try {
      const queryParams = new URLSearchParams()
      
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key])
        }
      })

      const queryString = queryParams.toString()
      const endpoint = queryString ? `/search?${queryString}` : '/search'
      
      const response = await apiService.get(endpoint)
      
      // 确保返回的是数组
      if (!Array.isArray(response)) {
        console.warn('API返回的数据不是数组:', response)
        return []
      }
      
      // 标准化活动数据
      return response.map(event => this.normalizeEventData(event))
    } catch (error) {
      console.error('获取活动失败:', error)
      throw error
    }
  }

  // 标准化活动数据结构
  normalizeEventData(event) {
    console.log('原始活动数据:', event);
    
    // 确保必要的字段存在
    const normalizedEvent = {
      event_id: event.event_id || event.id,
      name: event.name || event.title || '未命名活动',
      description: event.description || '',
      location: event.location || '地点待定',
      start: event.start || event.start_time,
      close_registration: event.close_registration || event.registration_end,
      max_attendees: event.max_attendees || event.capacity,
      number_attending: event.number_attending || event.attendee_count || 0,
      is_attending: event.is_attending || false,
      // 标准化创建者信息
      creator: this.normalizeCreatorData(event.creator || event.organizer || event.owner || event.user)
    };
    
    console.log('标准化后的事件数据:', normalizedEvent);
    return normalizedEvent;
  }

  // 标准化创建者信息
  normalizeCreatorData(creator) {
    console.log('原始创建者数据:', creator);
    
    if (!creator) {
      console.warn('创建者数据为空');
      return {
        user_id: 'unknown',
        first_name: '未知',
        last_name: '用户'
      }
    }
    
    // 尝试多种可能的ID字段名
    const creatorId = creator.user_id || creator.id || creator.userId || creator.creator_id;
    
    const normalizedCreator = {
      user_id: String(creatorId || 'unknown'), // 确保是字符串
      first_name: creator.first_name || creator.firstName || creator.name || '',
      last_name: creator.last_name || creator.lastName || ''
    };
    
    console.log('标准化后的创建者数据:', normalizedCreator);
    return normalizedCreator;
  }

  // ... 其他方法保持不变
  async getEvent(eventId) {
    return await apiService.get(`/event/${eventId}`)
  }

  async createEvent(eventData) {
    return await apiService.post('/events', eventData)
  }

  async updateEvent(eventId, eventData) {
    return await apiService.patch(`/event/${eventId}`, eventData)
  }

  async deleteEvent(eventId) {
    return await apiService.delete(`/event/${eventId}`)
  }

  async attendEvent(eventId) {
    return await apiService.post(`/event/${eventId}`)
  }

  async askQuestion(eventId, question) {
    return await apiService.post(`/event/${eventId}/question`, { question })
  }

  async deleteQuestion(questionId) {
    return await apiService.delete(`/question/${questionId}`)
  }

  async voteQuestion(questionId) {
    return await apiService.post(`/question/${questionId}/vote`)
  }

  async unvoteQuestion(questionId) {
    return await apiService.delete(`/question/${questionId}/vote`)
  }
}

export const eventsService = new EventsService()