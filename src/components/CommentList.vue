<template>
  <div class="comment-list">
    <div class="comment-list-header">
      <h3>问题与讨论 ({{ comments.length }})</h3>
      
      <div v-if="!isAuthenticated" class="auth-notice">
        <p>请先登录以提问或投票</p>
      </div>
      
      <div v-else-if="!canAskQuestions" class="auth-notice">
        <p v-if="isEventCreator">您不能在自己的活动中提问</p>
        <p v-else-if="!isUserAttending">只有活动参加者可以提问</p>
      </div>
      
      <form v-else @submit.prevent="handleSubmitQuestion" class="question-form">
        <div class="form-group">
          <textarea
            v-model="newQuestion"
            placeholder="输入您的问题..."
            class="form-input"
            rows="3"
            required
            :disabled="submitting"
          ></textarea>
        </div>
        <button 
          type="submit" 
          class="btn btn-primary"
          :disabled="submitting || !newQuestion.trim()"
        >
          {{ submitting ? '提交中...' : '提问' }}
        </button>
      </form>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    
    <div v-else-if="comments.length === 0" class="no-comments">
      <p>暂无问题，成为第一个提问的人吧！</p>
    </div>
    
    <div v-else class="comments-container">
      <Comment
        v-for="comment in sortedComments"
        :key="comment.question_id"
        :comment_text="comment.question"
        :author="comment.asked_by"
        :date_published="comment.created_at"
        :votes="comment.votes"
        :question_id="comment.question_id"
        :event_creator_id="eventCreatorId"
        :show-vote-button="showVoteButtons && !isEventCreator"
        :show-actions="isAuthenticated"
        @delete="handleDeleteComment"
        @vote-updated="handleVoteUpdated"
      />
    </div>
  </div>
</template>

<script>
import { eventsService } from '../services/events.service'
import { authService } from '../services/auth.service'
import Comment from './Comment.vue'

export default {
  name: 'CommentList',
  components: {
    Comment
  },
  props: {
    eventId: {
      type: Number,
      required: true
    },
    eventCreatorId: {
      type: Number,
      default: null
    },
    showVoteButtons: {
      type: Boolean,
      default: true
    },
    autoLoad: {
      type: Boolean,
      default: true
    },
    // 新增：用户是否参加了活动
    isUserAttending: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      comments: [],
      newQuestion: '',
      loading: false,
      submitting: false,
      error: ''
    }
  },
  computed: {
    isAuthenticated() {
      return authService.isAuthenticated()
    },
    currentUser() {
      return authService.getUser()
    },
    isEventCreator() {
      return this.currentUser && this.eventCreatorId && this.currentUser.user_id === this.eventCreatorId
    },
    canAskQuestions() {
      // 只有已认证、不是事件创建者、且已参加活动的用户才能提问
      return this.isAuthenticated && !this.isEventCreator && this.isUserAttending
    },
    sortedComments() {
      // 按票数降序排序，票数相同的按时间升序
      return [...this.comments].sort((a, b) => {
        if (b.votes !== a.votes) {
          return b.votes - a.votes
        }
        return a.question_id - b.question_id
      })
    }
  },
  methods: {
    async loadComments() {
      this.loading = true
      this.error = ''
      
      try {
        // 通过事件详情API获取问题列表
        const event = await eventsService.getEvent(this.eventId)
        this.comments = event.questions || []
      } catch (error) {
        this.error = error.message
        console.error('加载评论失败:', error)
      } finally {
        this.loading = false
      }
    },
    
    async handleSubmitQuestion() {
      if (!this.newQuestion.trim()) return
      
      this.submitting = true
      
      try {
        await eventsService.askQuestion(this.eventId, this.newQuestion.trim())
        this.newQuestion = ''
        // 重新加载评论列表
        await this.loadComments()
        this.$emit('question-added')
      } catch (error) {
        alert(error.message)
      } finally {
        this.submitting = false
      }
    },
    
    async handleDeleteComment(questionId) {
      try {
        await eventsService.deleteQuestion(questionId)
        // 从列表中移除已删除的评论
        this.comments = this.comments.filter(comment => 
          comment.question_id !== questionId
        )
        this.$emit('comment-deleted', questionId)
      } catch (error) {
        alert(error.message)
      }
    },
    
    handleVoteUpdated(updateData) {
      // 更新本地评论的投票数据
      const commentIndex = this.comments.findIndex(
        comment => comment.question_id === updateData.question_id
      )
      
      if (commentIndex !== -1) {
        this.comments[commentIndex].votes = updateData.votes
        // 触发重新排序
        this.comments = [...this.comments]
      }
    }
  },
  async mounted() {
    if (this.autoLoad) {
      await this.loadComments()
    }
  },
  watch: {
    eventId: {
      immediate: true,
      handler(newVal) {
        if (newVal && this.autoLoad) {
          this.loadComments()
        }
      }
    }
  }
}
</script>

<style scoped>
.comment-list {
  margin-top: 2rem;
}

.comment-list-header {
  margin-bottom: 1.5rem;
}

.comment-list-header h3 {
  color: #2c3e50;
  margin-bottom: 1rem;
}

.auth-notice {
  background: #e9ecef;
  padding: 1rem;
  border-radius: 4px;
  text-align: center;
  color: #6c757d;
}

.auth-notice p {
  margin: 0;
}

.question-form {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.form-group {
  margin-bottom: 1rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  resize: vertical;
  min-height: 80px;
}

.form-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
}

.btn-primary:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.comments-container > * {
  margin-bottom: 1rem;
}

.comments-container > *:last-child {
  margin-bottom: 0;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #6c757d;
}

.no-comments {
  text-align: center;
  padding: 3rem;
  background: #f8f9fa;
  border-radius: 8px;
  color: #6c757d;
}

.no-comments p {
  margin: 0;
}
</style>