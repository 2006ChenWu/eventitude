import { apiService } from './api.service'

class AuthService {
  constructor() {
    this.token = localStorage.getItem('session_token')
    this.user = JSON.parse(localStorage.getItem('user') || 'null')
  }

  isAuthenticated() {
    return !!this.token
  }

  getToken() {
    return this.token
  }

  getUser() {
    return this.user
  }

  async login(email, password) {
    try {
      const response = await apiService.post('/login', {
        email,
        password
      })

      if (response.session_token) {
        this.token = response.session_token
        this.user = {
          user_id: response.user_id,
          email: response.email,
          first_name: response.first_name,
          last_name: response.last_name
        }

        localStorage.setItem('session_token', this.token)
        localStorage.setItem('user', JSON.stringify(this.user))

        return { success: true, user: this.user }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { 
        success: false, 
        error: error.error_message || 'Login failed' 
      }
    }
  }

  async logout() {
    try {
      await apiService.post('/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      this.token = null
      this.user = null
      localStorage.removeItem('session_token')
      localStorage.removeItem('user')
    }
  }

  async register(userData) {
    try {
      const response = await apiService.post('/users', userData)
      return { success: true, data: response }
    } catch (error) {
      return { 
        success: false, 
        error: error.error_message || 'Registration failed' 
      }
    }
  }
}

export const authService = new AuthService()