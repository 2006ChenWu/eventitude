<template>
  <div class="event-card">
    <div class="event-header">
      <h3 class="event-title">{{ event.name }}</h3>
      <span class="event-status" :class="eventStatusClass">{{ eventStatusText }}</span>
    </div>
    
    <p class="event-description">{{ event.description }}</p>
    
    <div class="event-details">
      <div class="detail-item">
        <strong>地点:</strong> {{ event.location }}
      </div>
      <div class="detail-item">
        <strong>时间:</strong> {{ formatDate(event.start) }}
      </div>
      <div class="detail-item">
        <strong>报名截止:</strong> {{ formatDate(event.close_registration) }}
      </div>
      <div class="detail-item">
        <strong>人数:</strong> {{ formatAttendeeCount(event.number_attending || event.attendee_count) }}/{{ event.max_attendees }}
      </div>
      <div class="detail-item">
        <strong>创建者:</strong> {{ event.creator.first_name }} {{ event.creator.last_name }}
      </div>
    </div>

    <div class="event-actions">
      <!-- 如果是创建者，不显示报名按钮 -->
      <button 
        v-if="!isCreator && !event.is_attending && eventStatus === 'OPEN'" 
        @click="onAttend" 
        class="btn btn-success"
        :disabled="attendingInProgress"
      >
        {{ attendingInProgress ? '报名中...' : '报名参加' }}
      </button>
      <button 
        v-else-if="!isCreator && event.is_attending" 
        class="btn btn-disabled" 
        disabled
      >
        已报名
      </button>
      <router-link 
        :to="`/event/${event.event_id}`" 
        class="btn btn-primary"
      >
        查看详情
      </router-link>
    </div>
  </div>
</template>

<script>
import { eventsService } from '../services/events.service'
import { authService } from '../services/auth.service'

export default {
  name: 'EventCard',
  props: {
    event: {
      type: Object,
      required: true
    },
    isCreator: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      attendingInProgress: false
    }
  },
  computed: {
    eventStatus() {
      const now = Date.now() // 使用毫秒级当前时间
      if (this.event.close_registration === -1) {
        return 'ARCHIVED'
      } else if (this.event.close_registration < now) {
        return 'CLOSED'
      } else {
        return 'OPEN'
      }
    },
    eventStatusText() {
      const statusMap = {
        'ARCHIVED': '已归档',
        'CLOSED': '已结束',
        'OPEN': '报名中'
      }
      return statusMap[this.eventStatus]
    },
    eventStatusClass() {
      return `status-${this.eventStatus.toLowerCase()}`
    }
  },
  methods: {
    formatDate(timestamp) {
      if (!timestamp || timestamp === -1) return '未设置'
      
      try {
        // 直接使用时间戳，因为已经是毫秒级
        const date = new Date(timestamp)
        if (isNaN(date.getTime())) {
          return '无效日期'
        }
        
        // 格式化为 DD/MM/YYYY HH:mm:ss
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear()
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        const seconds = date.getSeconds().toString().padStart(2, '0')
        
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
      } catch (error) {
        console.error('日期格式化错误:', error, '时间戳:', timestamp)
        return '日期错误'
      }
    },
    
    formatAttendeeCount(count) {
      return count !== undefined && count !== null ? count : 0
    },
    
    async onAttend() {
      if (this.attendingInProgress) return
      
      this.attendingInProgress = true
      
      try {
        await this.$emit('attend', this.event.event_id)
      } catch (error) {
        console.error('报名操作失败:', error)
      } finally {
        this.attendingInProgress = false
      }
    }
  }
}
</script>

<style scoped>
.event-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.event-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.event-title {
  margin: 0;
  color: #2c3e50;
  font-size: 1.25rem;
  line-height: 1.4;
}

.event-status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
  white-space: nowrap;
}

.status-open {
  background: #d4edda;
  color: #155724;
}

.status-closed {
  background: #f8d7da;
  color: #721c24;
}

.status-archived {
  background: #e2e3e5;
  color: #383d41;
}

.event-description {
  color: #555;
  margin-bottom: 1rem;
  line-height: 1.5;
  
  /* 多行文本截断的完整兼容性方案 */
  /* Webkit 浏览器支持 */
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  
  /* 标准属性提案（尚未广泛支持） */
  line-clamp: 3;
  box-orient: vertical;
  
  /* 后备方案 */
  max-height: 4.5em; /* 3行 * 1.5行高 */
  position: relative;
}

/* 为不支持 line-clamp 的浏览器添加渐变遮罩 */
.event-description:after {
  content: "";
  text-align: right;
  position: absolute;
  bottom: 0;
  right: 0;
  width: 70%;
  height: 1.5em;
  background: linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1) 50%);
  /* 只在需要截断时显示遮罩 */
  display: none;
}

/* 当文本确实被截断时显示遮罩 */
.event-description.truncated:after {
  display: block;
}

.event-details {
  margin-bottom: 1.5rem;
}

.detail-item {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.event-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  text-align: center;
  font-size: 0.9rem;
  transition: background-color 0.3s;
}

.btn-success {
  background: #27ae60;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #219a52;
}

.btn-success:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
}

.btn-disabled {
  background: #95a5a6;
  color: white;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .event-card {
    padding: 1rem;
  }
  
  .event-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .event-actions {
    flex-direction: column;
  }
}
</style>