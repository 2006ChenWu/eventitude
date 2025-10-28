<template>
  <div class="comment">
    <div class="comment-header">
      <div class="comment-author">
        {{ author.first_name }} {{ author.last_name }}
      </div>
    </div>
    
    <div class="comment-body">
      {{ comment_text }}
    </div>
    
    <div class="comment-footer">
      <div class="comment-votes">
        <button 
          v-if="showVoteButton && canVote" 
          @click="handleVote" 
          class="vote-btn"
          :class="{ 'voted': hasVoted }"
          :disabled="votingInProgress"
        >
          ↑ {{ currentVotes }}
        </button>
        <span v-else class="vote-count">
        number of votes: {{ currentVotes }}
        </span>
      </div>
      
      <div class="comment-actions" v-if="showActions">
        <button 
          @click="handleDelete" 
          class="btn btn-danger btn-sm"
          :disabled="deletingInProgress"
        >
          {{ deletingInProgress ? '删除中...' : '删除' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { eventsService } from '../services/events.service'
import { authService } from '../services/auth.service'

export default {
  name: 'Comment',
  props: {
    comment_text: {
      type: String,
      required: true
    },
    author: {
      type: Object,
      required: true,
      default: () => ({
        first_name: '',
        last_name: '',
        user_id: null
      })
    },
    date_published: {
      type: [String, Number],
      default: null
    },
    votes: {
      type: Number,
      default: 0
    },
    question_id: {
      type: Number,
      required: true
    },
    event_creator_id: {
      type: Number,
      default: null
    },
    showVoteButton: {
      type: Boolean,
      default: true
    },
    showActions: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      hasVoted: false,
      currentVotes: this.votes,
      votingInProgress: false,
      deletingInProgress: false
    }
  },
  computed: {
    currentUser() {
      return authService.getUser()
    },
    canDelete() {
      if (!this.currentUser) return false
      
      // 用户可以删除自己的评论，或者事件创建者可以删除任何评论
      const isOwner = this.currentUser.user_id === this.author.user_id
      const isEventCreator = this.currentUser.user_id === this.event_creator_id
      
      return isOwner || isEventCreator
    },
    canVote() {
      if (!this.currentUser) return false
      
      // 用户不能投票给自己的问题，事件创建者不能投票
      const isOwner = this.currentUser.user_id === this.author.user_id
      const isEventCreator = this.currentUser.user_id === this.event_creator_id
      
      return !isOwner && !isEventCreator
    }
  },
  methods: {
    async handleVote() {
      if (!this.currentUser) {
        alert('请先登录')
        return
      }
      
      if (!this.canVote) {
        alert('您没有权限投票')
        return
      }
      
      if (this.votingInProgress) return
      
      this.votingInProgress = true
      
      try {
        if (this.hasVoted) {
          // 取消投票
          await eventsService.unvoteQuestion(this.question_id)
          this.currentVotes--
        } else {
          // 投票
          await eventsService.voteQuestion(this.question_id)
          this.currentVotes++
        }
        this.hasVoted = !this.hasVoted
        this.$emit('vote-updated', {
          question_id: this.question_id,
          votes: this.currentVotes,
          hasVoted: this.hasVoted
        })
      } catch (error) {
        console.error('投票失败:', error)
        
        // 更详细的错误处理
        if (error.message.includes('403')) {
          alert('投票失败：权限不足。可能的原因：\n1. 您是活动创建者\n2. 您是问题提出者\n3. 您没有参加此活动')
        } else if (error.message.includes('401')) {
          alert('登录已过期，请重新登录')
          this.$router.push('/login')
        } else {
          alert('投票失败：' + error.message)
        }
      } finally {
        this.votingInProgress = false
      }
    },
    
    async handleDelete() {
      if (!this.canDelete) {
        alert('您没有权限删除此评论')
        return
      }
      
      if (this.deletingInProgress) return
      
      if (confirm('确定要删除这个评论吗？')) {
        this.deletingInProgress = true
        
        try {
          await eventsService.deleteQuestion(this.question_id)
          this.$emit('delete', this.question_id)
        } catch (error) {
          console.error('删除失败:', error)
          
          if (error.message.includes('403')) {
            alert('删除失败：权限不足')
          } else if (error.message.includes('401')) {
            alert('登录已过期，请重新登录')
            this.$router.push('/login')
          } else {
            alert('删除失败：' + error.message)
          }
        } finally {
          this.deletingInProgress = false
        }
      }
    }
  },
  mounted() {
    // 初始化投票状态
    this.currentVotes = this.votes
  }
}
</script>

<style scoped>
.comment {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #e9ecef;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.comment-author {
  font-weight: bold;
  color: #2c3e50;
}

.comment-body {
  margin-bottom: 1rem;
  line-height: 1.5;
  color: #495057;
}

.comment-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.vote-btn {
  background: #3498db;
  color: white;
  border: 1px solid #2980b9;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: bold;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 60px;
  justify-content: center;
}

.vote-btn:hover:not(:disabled) {
  background: #2980b9;
  transform: translateY(-2px);
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.vote-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.vote-btn.voted {
  background: #27ae60;
  border-color: #219a52;
}

.vote-count {
  font-weight: bold;
  color: #495057;
  font-size: 0.9rem;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}
</style>