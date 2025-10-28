<template>
  <div class="create-event">
    <div class="page-header">
      <h1>创建新活动</h1>
    </div>

    <form @submit.prevent="createEvent" class="event-form card">
      <div class="form-group">
        <label class="form-label">活动名称 *</label>
        <input 
          v-model="form.name" 
          type="text" 
          class="form-input" 
          required
          placeholder="输入活动名称"
        >
        <div v-if="errors.name" class="error-message">{{ errors.name }}</div>
      </div>

      <div class="form-group">
        <label class="form-label">活动描述 *</label>
        <textarea 
          v-model="form.description" 
          class="form-input" 
          rows="4"
          required
          placeholder="详细描述您的活动"
        ></textarea>
        <div v-if="errors.description" class="error-message">{{ errors.description }}</div>
      </div>

      <div class="form-group">
        <label class="form-label">活动地点 *</label>
        <input 
          v-model="form.location" 
          type="text" 
          class="form-input" 
          required
          placeholder="输入活动地点"
        >
        <div v-if="errors.location" class="error-message">{{ errors.location }}</div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">开始时间 *</label>
          <input 
            v-model="form.start" 
            type="datetime-local" 
            class="form-input" 
            required
          >
          <div v-if="errors.start" class="error-message">{{ errors.start }}</div>
        </div>

        <div class="form-group">
          <label class="form-label">报名截止时间 *</label>
          <input 
            v-model="form.close_registration" 
            type="datetime-local" 
            class="form-input" 
            required
          >
          <div v-if="errors.close_registration" class="error-message">{{ errors.close_registration }}</div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">最大参加人数 *</label>
        <input 
          v-model="form.max_attendees" 
          type="number" 
          class="form-input" 
          min="1"
          required
          placeholder="输入最大参加人数"
        >
        <div v-if="errors.max_attendees" class="error-message">{{ errors.max_attendees }}</div>
      </div>

      <div v-if="submitError" class="error-message submit-error">{{ submitError }}</div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? '创建中...' : '创建活动' }}
        </button>
        <router-link to="/" class="btn btn-secondary">取消</router-link>
      </div>
    </form>
  </div>
</template>

<script>
import { eventsService } from '../services/events.service'

export default {
  name: 'CreateEvent',
  data() {
    return {
      form: {
        name: '',
        description: '',
        location: '',
        start: '',
        close_registration: '',
        max_attendees: ''
      },
      errors: {},
      loading: false,
      submitError: ''
    }
  },
  methods: {
    validateForm() {
      this.errors = {}
      let isValid = true

      // 基础验证
      if (!this.form.name.trim()) {
        this.errors.name = '活动名称不能为空'
        isValid = false
      }

      if (!this.form.description.trim()) {
        this.errors.description = '活动描述不能为空'
        isValid = false
      }

      if (!this.form.location.trim()) {
        this.errors.location = '活动地点不能为空'
        isValid = false
      }

      // 时间验证
      const now = new Date()
      const startTime = new Date(this.form.start)
      const closeTime = new Date(this.form.close_registration)

      if (!this.form.start) {
        this.errors.start = '开始时间不能为空'
        isValid = false
      } else if (startTime <= now) {
        this.errors.start = '开始时间必须是将来的时间'
        isValid = false
      }

      if (!this.form.close_registration) {
        this.errors.close_registration = '报名截止时间不能为空'
        isValid = false
      } else if (closeTime <= now) {
        this.errors.close_registration = '报名截止时间必须是将来的时间'
        isValid = false
      } else if (closeTime >= startTime) {
        this.errors.close_registration = '报名截止时间必须在开始时间之前'
        isValid = false
      }

      // 人数验证
      if (!this.form.max_attendees || this.form.max_attendees < 1) {
        this.errors.max_attendees = '最大参加人数必须大于0'
        isValid = false
      }

      return isValid
    },

    async createEvent() {
      if (!this.validateForm()) {
        return
      }

      this.loading = true
      this.submitError = ''

      try {
        // 转换时间格式为Unix时间戳
        const eventData = {
          ...this.form,
          start: Math.floor(new Date(this.form.start).getTime() / 1000),
          close_registration: Math.floor(new Date(this.form.close_registration).getTime() / 1000),
          max_attendees: parseInt(this.form.max_attendees)
        }

        const result = await eventsService.createEvent(eventData)
        
        this.$router.push(`/event/${result.event_id}`)
      } catch (error) {
        this.submitError = error.message
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.create-event {
  max-width: 600px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  color: #2c3e50;
  text-align: center;
}

.event-form {
  padding: 2rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.submit-error {
  text-align: center;
  font-size: 1rem;
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>