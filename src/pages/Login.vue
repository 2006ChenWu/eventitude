<template>
  <div class="login-page">
    <div class="login-container">
      <h1>登录 Eventitude</h1>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label class="form-label">邮箱</label>
          <input 
            v-model="form.email" 
            type="email" 
            class="form-input" 
            required
          >
        </div>
        
        <div class="form-group">
          <label class="form-label">密码</label>
          <input 
            v-model="form.password" 
            type="password" 
            class="form-input" 
            required
          >
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <p class="register-link">
        还没有账号？ <a href="#" @click.prevent="showRegister = true">立即注册</a>
      </p>

      <!-- 注册表单 -->
      <div v-if="showRegister" class="register-section">
        <h2>注册新账号</h2>
        <form @submit.prevent="handleRegister" class="register-form">
          <div class="form-group">
            <label class="form-label">名字</label>
            <input v-model="registerForm.first_name" class="form-input" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">姓氏</label>
            <input v-model="registerForm.last_name" class="form-input" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">邮箱</label>
            <input v-model="registerForm.email" type="email" class="form-input" required>
          </div>
          
          <div class="form-group">
            <label class="form-label">密码</label>
            <input v-model="registerForm.password" type="password" class="form-input" required>
          </div>

          <div v-if="registerError" class="error-message">{{ registerError }}</div>

          <div class="form-actions">
            <button type="submit" class="btn btn-success" :disabled="registerLoading">
              {{ registerLoading ? '注册中...' : '注册' }}
            </button>
            <button type="button" class="btn btn-secondary" @click="showRegister = false">
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { authService } from '../services/auth.service'

export default {
  name: 'Login',
  data() {
    return {
      form: {
        email: '',
        password: ''
      },
      registerForm: {
        first_name: '',
        last_name: '',
        email: '',
        password: ''
      },
      loading: false,
      registerLoading: false,
      error: '',
      registerError: '',
      showRegister: false
    }
  },
  methods: {
    async handleLogin() {
      this.loading = true
      this.error = ''

      try {
        const result = await authService.login(this.form.email, this.form.password)
        
        if (result.success) {
          this.$router.push('/')
        } else {
          this.error = '登录失败：邮箱或密码错误'
        }
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async handleRegister() {
      this.registerLoading = true
      this.registerError = ''

      try {
        const result = await authService.register(this.registerForm)
        
        if (result.success) {
          this.showRegister = false
          this.registerForm = {
            first_name: '',
            last_name: '',
            email: '',
            password: ''
          }
          alert('注册成功！请登录')
        } else {
          this.registerError = '注册失败：请检查输入信息'
        }
      } catch (error) {
        this.registerError = error.message
      } finally {
        this.registerLoading = false
      }
    }
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
}

.login-container {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
}

.login-container h1 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #2c3e50;
}

.login-form {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #555;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-input:focus {
  outline: none;
  border-color: #3498db;
}

.btn-block {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
}

.register-link {
  text-align: center;
  color: #555;
}

.register-link a {
  color: #3498db;
  text-decoration: none;
}

.register-link a:hover {
  text-decoration: underline;
}

.register-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #eee;
}

.register-section h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #2c3e50;
  font-size: 1.25rem;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
}
</style>