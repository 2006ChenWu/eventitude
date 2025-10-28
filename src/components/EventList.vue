<template>
  <div class="event-list">
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>
    
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="$emit('retry')" class="btn btn-primary">重试</button>
    </div>
    
    <div v-else-if="events.length === 0" class="empty-state">
      <p>{{ emptyMessage }}</p>
      <slot name="empty-action"></slot>
    </div>
    
    <div v-else class="events-container">
      <div class="events-grid" :class="layoutClass">
        <slot name="event" v-for="event in events" :event="event">
          <EventCard
            :event="event"
            @attend="handleAttendEvent"
          />
        </slot>
      </div>
      
      <!-- 分页控件 -->
      <div v-if="showPagination && totalPages > 1" class="pagination">
        <button 
          @click="goToPage(currentPage - 1)" 
          :disabled="currentPage === 1"
          class="pagination-btn"
        >
          上一页
        </button>
        
        <span class="pagination-info">
          第 {{ currentPage }} 页，共 {{ totalPages }} 页
        </span>
        
        <button 
          @click="goToPage(currentPage + 1)" 
          :disabled="currentPage === totalPages"
          class="pagination-btn"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import EventCard from './EventCard.vue'

export default {
  name: 'EventList',
  components: {
    EventCard
  },
  props: {
    events: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    },
    emptyMessage: {
      type: String,
      default: '没有找到相关活动'
    },
    layout: {
      type: String,
      default: 'grid', // 'grid' | 'list'
    },
    showPagination: {
      type: Boolean,
      default: false
    },
    currentPage: {
      type: Number,
      default: 1
    },
    pageSize: {
      type: Number,
      default: 10
    },
    totalItems: {
      type: Number,
      default: 0
    }
  },
  computed: {
    layoutClass() {
      return `layout-${this.layout}`
    },
    totalPages() {
      return Math.ceil(this.totalItems / this.pageSize)
    },
    paginatedEvents() {
      if (!this.showPagination) {
        return this.events
      }
      
      const startIndex = (this.currentPage - 1) * this.pageSize
      const endIndex = startIndex + this.pageSize
      return this.events.slice(startIndex, endIndex)
    }
  },
  methods: {
    handleAttendEvent(eventId) {
      this.$emit('attend', eventId)
    },
    
    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.$emit('page-change', page)
      }
    }
  }
}
</script>

<style scoped>
.event-list {
  width: 100%;
}

.loading-state {
  text-align: center;
  padding: 3rem;
  color: #6c757d;
}

.loading-spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  text-align: center;
  padding: 3rem;
  color: #e74c3c;
}

.error-state p {
  margin-bottom: 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #6c757d;
  background: #f8f9fa;
  border-radius: 8px;
}

.empty-state p {
  margin-bottom: 1rem;
}

.events-container {
  width: 100%;
}

.events-grid.layout-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
}

.events-grid.layout-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e9ecef;
}

.pagination-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #dee2e6;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.pagination-btn:hover:not(:disabled) {
  background: #3498db;
  color: white;
  border-color: #3498db;
}

.pagination-btn:disabled {
  background: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
}

.pagination-info {
  color: #6c757d;
  font-size: 0.9rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .events-grid.layout-grid {
    grid-template-columns: 1fr;
  }
  
  .pagination {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>