<template>
  <div class="event-detail">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="event" class="event-content">
      <!-- 事件头部 -->
      <div class="event-header card">
        <div class="header-top">
          <h1 class="event-title">{{ event.name }}</h1>
          <span class="event-status" :class="eventStatusClass">{{ eventStatusText }}</span>
        </div>
        
        <p class="event-description">{{ event.description }}</p>
        
        <div class="event-meta">
          <div class="meta-item">
            <strong>地点:</strong> {{ event.location }}
          </div>
          <div class="meta-item">
            <strong>开始时间:</strong> {{ formatDate(event.start) }}
          </div>
          <div class="meta-item">
            <strong>报名截止:</strong> {{ formatDate(event.close_registration) }}
          </div>
          <div class="meta-item">
            <strong>人数限制:</strong> {{ event.number_attending }}/{{ event.max_attendees }}
          </div>
          <div class="meta-item">
            <strong>创建者:</strong> {{ event.creator.first_name }} {{ event.creator.last_name }}
          </div>
        </div>

        <div class="event-actions">
          <!-- 未报名的非创建者显示报名按钮 -->
          <button 
            v-if="!isCreator && !isAttending && eventStatus === 'OPEN'" 
            @click="attendEvent" 
            class="btn btn-success"
            :disabled="attendingInProgress"
          >
            {{ attendingInProgress ? '报名中...' : '报名参加' }}
          </button>
          <!-- 已报名的用户显示已报名按钮（创建者除外） -->
          <button 
            v-else-if="!isCreator && isAttending" 
            class="btn btn-disabled" 
            disabled
          >
            已报名
          </button>
          <!-- 创建者只显示删除按钮 -->
          <button 
            v-if="isCreator" 
            @click="deleteEvent" 
            class="btn btn-danger"
          >
            删除活动
          </button>
        </div>
      </div>

      <!-- 参加者列表（仅创建者可见） -->
      <div v-if="isCreator && event.attendees" class="attendees-section card">
        <h2>参加者列表</h2>
        <ul class="attendees-list">
          <li v-for="attendee in event.attendees" :key="attendee.user_id" class="attendee-item">
            {{ attendee.first_name }} {{ attendee.last_name }} ({{ attendee.email }})
          </li>
        </ul>
      </div>

      <!-- 使用 CommentList 组件 -->
      <CommentList 
        v-if="event && event.creator"
        :eventId="event.event_id"
        :eventCreatorId="getEventCreatorId"
        :isUserAttending="isAttending"
      />
    </div>
  </div>
</template>

<script>
import { eventsService } from '../services/events.service'
import { authService } from '../services/auth.service'
import CommentList from '../components/CommentList.vue'

export default {
  name: 'EventDetail',
  components: {
    CommentList
  },
  data() {
    return {
      event: null,
      loading: false,
      error: '',
      localAttendingState: false,
      attendingInProgress: false
    }
  },
  computed: {
    isAuthenticated() {
      return authService.isAuthenticated()
    },
    user() {
      return authService.getUser()
    },
    isCreator() {
      if (!this.event || !this.user) return false
      
      // 多种方式检查创建者身份
      const creatorId = this.getEventCreatorId
      const userId = this.user.user_id
      
      return creatorId && userId && creatorId === userId
    },
    isAttending() {
      return this.localAttendingState || (this.event ? this.event.is_attending : false)
    },
    eventStatus() {
      if (!this.event) return ''
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
    },
    // 安全地获取事件创建者 ID
    getEventCreatorId() {
      if (!this.event || !this.event.creator) return null
      
      // 尝试多种可能的字段名
      return this.event.creator.user_id || 
             this.event.creator.creator_id || 
             this.event.creator.id
    }
  },
  methods: {
    async loadEvent() {
      this.loading = true
      this.error = ''
      
      try {
        this.event = await eventsService.getEvent(this.$route.params.id)
        console.log('完整的事件数据:', this.event)
        console.log('创建者信息:', this.event.creator)
        console.log('创建者ID:', this.getEventCreatorId)
        
        // 检查是否有本地存储的报名状态
        const localState = this.getLocalAttendingState(this.event.event_id)
        if (localState !== null) {
          this.localAttendingState = localState
        }
      } catch (error) {
        this.error = error.message
        console.error('加载事件失败:', error)
      } finally {
        this.loading = false
      }
    },

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

    async attendEvent() {
      if (this.attendingInProgress) return
      
      this.attendingInProgress = true
      
      try {
        await eventsService.attendEvent(this.event.event_id)
        // 更新本地状态
        this.localAttendingState = true
        this.saveLocalAttendingState(this.event.event_id, true)
        // 更新参加人数
        if (this.event.number_attending !== undefined) {
          this.event.number_attending += 1
        }
        alert('报名成功！')
      } catch (error) {
        if (error.message.includes('already registered')) {
          // 如果已经报名，直接更新本地状态
          this.localAttendingState = true
          this.saveLocalAttendingState(this.event.event_id, true)
          alert('您已经报名参加了此活动')
        } else {
          alert(error.message)
        }
      } finally {
        this.attendingInProgress = false
      }
    },

    // 保存本地报名状态
    saveLocalAttendingState(eventId, isAttending) {
      const user = authService.getUser()
      if (!user) return
      
      const key = `attending_${user.user_id}_${eventId}`
      localStorage.setItem(key, JSON.stringify(isAttending))
    },

    // 获取本地报名状态
    getLocalAttendingState(eventId) {
      const user = authService.getUser()
      if (!user) return null
      
      const key = `attending_${user.user_id}_${eventId}`
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : null
    },

    async deleteEvent() {
      if (!confirm('确定要删除这个活动吗？此操作不可恢复。')) return
      
      try {
        await eventsService.deleteEvent(this.event.event_id)
        this.$router.push('/')
      } catch (error) {
        alert(error.message)
      }
    }
  },
  mounted() {
    this.loadEvent()
  }
}
</script>

<style scoped>
.event-detail {
  max-width: 800px;
  margin: 0 auto;
}

.event-header {
  margin-bottom: 2rem;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.event-title {
  margin: 0;
  color: #2c3e50;
  font-size: 2rem;
}

.event-status {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: bold;
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
  font-size: 1.1rem;
  line-height: 1.6;
  color: #555;
  margin-bottom: 1.5rem;
}

.event-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.meta-item {
  padding: 0.5rem 0;
}

.event-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.attendees-section h2 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.attendees-list {
  list-style: none;
  padding: 0;
}

.attendee-item {
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
}

.attendee-item:last-child {
  border-bottom: none;
}

/* 按钮样式 */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
  text-decoration: none;
  display: inline-block;
  text-align: center;
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

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
}

.btn-disabled {
  background: #95a5a6;
  color: white;
  cursor: not-allowed;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.loading, .error {
  text-align: center;
  padding: 3rem;
  font-size: 1.1rem;
}

.error {
  color: #e74c3c;
  background: #fdf2f2;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
}
</style>