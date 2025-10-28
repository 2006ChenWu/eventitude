<template>
  <div class="home">
    <div class="page-header">
      <h1>发现精彩活动</h1>
      <div class="filters">
        <select v-model="filters.status" @change="loadEvents" class="form-input">
          <option value="">所有活动</option>
          <option value="OPEN">开放报名</option>
          <option value="MY_EVENTS">我的活动</option>
          <option value="ATTENDING">我参加的</option>
          <option value="ARCHIVE">已归档</option>
        </select>
        <input 
          v-model="filters.q" 
          @input="onSearchInput" 
          placeholder="搜索活动..." 
          class="form-input"
        >
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="events.length === 0" class="no-events">
      没有找到相关活动
    </div>
    <div v-else class="events-grid">
      <EventCard 
        v-for="event in events" 
        :key="event.event_id"
        :event="event"
        @attend="handleAttend"
      />
    </div>
  </div>
</template>

<script>
import { eventsService } from '../services/events.service'
import { authService } from '../services/auth.service'
import EventCard from '../components/EventCard.vue'

export default {
  name: 'Home',
  components: {
    EventCard
  },
  data() {
    return {
      events: [],
      loading: false,
      error: '',
      filters: {
        q: '',
        status: ''
      },
      searchTimeout: null
    }
  },
  methods: {
    async loadEvents() {
      this.loading = true
      this.error = ''
      
      try {
        this.events = await eventsService.getEvents(this.filters)
      } catch (error) {
        this.error = error.message
        console.error('Load events error:', error)
      } finally {
        this.loading = false
      }
    },

    onSearchInput() {
      clearTimeout(this.searchTimeout)
      this.searchTimeout = setTimeout(() => {
        this.loadEvents()
      }, 500)
    },

    async handleAttend(eventId) {
      try {
        await eventsService.attendEvent(eventId)
        
        // 立即更新本地状态，不需要重新加载整个列表
        this.updateEventAttendingStatus(eventId, true)
        
        // 保存到本地存储，以便详情页也能获取到最新状态
        this.saveLocalAttendingState(eventId, true)
        
        // 显示成功提示
        this.showSuccessMessage('报名成功！')
      } catch (error) {
        if (error.message.includes('already registered')) {
          // 如果已经报名，直接更新本地状态
          this.updateEventAttendingStatus(eventId, true)
          this.saveLocalAttendingState(eventId, true)
          this.showSuccessMessage('您已经报名参加了此活动')
        } else {
          alert(error.message)
        }
      }
    },

    // 更新单个活动的报名状态
    updateEventAttendingStatus(eventId, isAttending) {
      const eventIndex = this.events.findIndex(event => event.event_id === eventId)
      if (eventIndex !== -1) {
        // 使用 Vue.set 或直接赋值确保响应式更新
        this.events[eventIndex].is_attending = isAttending
        // 增加参加人数计数
        if (isAttending) {
          const currentCount = this.events[eventIndex].number_attending || 0
          this.events[eventIndex].number_attending = currentCount + 1
        }
        
        // 强制更新数组触发响应式
        this.events = [...this.events]
      }
    },

    // 保存本地报名状态
    saveLocalAttendingState(eventId, isAttending) {
      const user = authService.getUser()
      if (!user) return
      
      const key = `attending_${user.user_id}_${eventId}`
      localStorage.setItem(key, JSON.stringify(isAttending))
    },

    // 显示成功消息
    showSuccessMessage(message) {
      // 可以在这里添加更友好的提示，比如使用 Toast 组件
      console.log(message)
      // 暂时使用 alert，您可以替换为更友好的 UI 提示
      alert(message)
    }
  },
  mounted() {
    this.loadEvents()
  }
}
</script>

<style scoped>
.home {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-header h1 {
  color: #2c3e50;
}

.filters {
  display: flex;
  gap: 1rem;
}

.filters .form-input {
  width: auto;
  min-width: 150px;
}

.events-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
}

.loading, .error, .no-events {
  text-align: center;
  padding: 3rem;
  font-size: 1.1rem;
  color: #7f8c8d;
}

.error {
  color: #e74c3c;
}
</style>