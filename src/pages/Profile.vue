<template>
  <div class="profile">
    <div class="page-header">
      <h1>个人资料</h1>
    </div>

    <div class="profile-content">
      <!-- 用户信息 -->
      <div class="user-info card" v-if="user">
        <h2>基本信息</h2>
        <div class="info-grid">
          <div class="info-item">
            <strong>姓名:</strong> 
            <span v-if="user.first_name || user.last_name">
              {{ user.first_name }} {{ user.last_name }}
            </span>
            <span v-else class="placeholder">未设置姓名</span>
          </div>
          <div class="info-item">
            <strong>邮箱:</strong> 
            <span v-if="user.email">{{ user.email }}</span>
            <span v-else class="placeholder">未设置邮箱</span>
          </div>
          <div class="info-item">
            <strong>用户ID:</strong> {{ user.user_id || 'N/A' }}
          </div>
        </div>
      </div>

      <!-- 用户未登录状态 -->
      <div v-else class="user-info card">
        <div class="login-prompt">
          <h2>未登录</h2>
          <p>请登录以查看个人资料</p>
          <button @click="goToLogin" class="login-btn">前往登录</button>
        </div>
      </div>

      <!-- 用户活动 -->
      <div class="user-events" v-if="user">
        <div class="events-tabs">
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'created' }"
            @click="activeTab = 'created'"
          >
            我创建的活动
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'attending' }"
            @click="activeTab = 'attending'"
          >
            我参加的活动
          </button>
        </div>

        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="eventsError" class="error">
          {{ eventsError }}
          <button @click="loadAllEvents" class="retry-btn">重试</button>
        </div>
        <div v-else-if="userEvents.length === 0" class="no-events">
          暂无{{ activeTab === 'created' ? '创建' : '参加' }}的活动
        </div>
        <div v-else class="events-list">
          <EventCard 
            v-for="event in userEvents" 
            :key="event.event_id"
            :event="event"
            :is-creator="activeTab === 'created'"
            @attend="handleAttend"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { eventsService } from '../services/events.service'
import { authService } from '../services/auth.service'
import EventCard from '../components/EventCard.vue'

export default {
  name: 'Profile',
  components: {
    EventCard
  },
  data() {
    return {
      user: null,
      userEvents: [],
      loading: false,
      eventsError: '',
      activeTab: 'created',
      allEvents: []
    }
  },
  watch: {
    activeTab() {
      this.filterUserEvents()
    }
  },
  methods: {
    loadUserInfo() {
      const userData = authService.getUser();
      
      if (!userData) {
        console.warn('未找到用户信息');
        this.user = null;
        return;
      }
      
      // 确保用户ID是字符串类型，便于比较
      this.user = {
        ...userData,
        user_id: String(userData.user_id || '')
      };
    },

    async loadAllEvents() {
      this.loading = true;
      this.eventsError = '';

      try {
        // 获取所有事件，然后在前端进行过滤
        this.allEvents = await eventsService.getEvents();
        
        // 初始过滤
        this.filterUserEvents();
        
      } catch (error) {
        console.error('加载活动失败:', error);
        this.eventsError = error.message || '加载活动失败，请稍后重试';
        this.userEvents = [];
      } finally {
        this.loading = false;
      }
    },

    filterUserEvents() {
      if (!this.allEvents.length || !this.user) {
        this.userEvents = [];
        return;
      }

      const userId = this.user.user_id;
      
      if (this.activeTab === 'created') {
        // 过滤出用户创建的活动
        this.userEvents = this.allEvents.filter(event => 
          event.creator && event.creator.user_id === userId
        );
      } else {
        // 过滤出用户参加的活动
        this.userEvents = this.allEvents.filter(event => 
          event.is_attending === true
        );
      }
    },

    handleAttend(eventId) {
      // 重新加载所有事件
      this.loadAllEvents();
    },
    
    goToLogin() {
      this.$router.push('/login');
    }
  },
  mounted() {
    this.loadUserInfo();
    this.loadAllEvents();
  }
}
</script>

<style scoped>
.profile {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  color: #2c3e50;
  font-size: 2rem;
  border-bottom: 2px solid #3498db;
  padding-bottom: 0.5rem;
}

.profile-content {
  display: grid;
  gap: 2rem;
}

.user-info {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  padding: 1.5rem;
}

.user-info h2 {
  margin-bottom: 1rem;
  color: #2c3e50;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
}

.info-grid {
  display: grid;
  gap: 1rem;
}

.info-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item strong {
  min-width: 80px;
  color: #555;
}

.placeholder {
  color: #999;
  font-style: italic;
}

.login-prompt {
  text-align: center;
  padding: 3rem 2rem;
}

.login-prompt h2 {
  color: #e74c3c;
  margin-bottom: 1rem;
}

.login-prompt p {
  color: #7f8c8d;
  margin-bottom: 1.5rem;
}

.login-btn {
  padding: 0.75rem 2rem;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

.login-btn:hover {
  background-color: #27ae60;
}

.events-tabs {
  display: flex;
  border-bottom: 1px solid #ddd;
  margin-bottom: 1.5rem;
}

.tab-btn {
  padding: 1rem 2rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 1rem;
  color: #555;
  transition: all 0.3s;
}

.tab-btn:hover {
  background: #f8f9fa;
}

.tab-btn.active {
  color: #3498db;
  border-bottom-color: #3498db;
  background: #f8f9fa;
}

.events-list {
  display: grid;
  gap: 1.5rem;
}

.loading, .error, .no-events {
  text-align: center;
  padding: 3rem;
  font-size: 1.1rem;
  color: #7f8c8d;
}

.error {
  color: #e74c3c;
  background: #fdf2f2;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.no-events {
  background: #f8f9fa;
  border-radius: 6px;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  padding: 1.5rem;
}
</style>