const BASE_URL = 'http://localhost:3333'

class ApiService {
  constructor() {
    this.baseURL = BASE_URL
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    // 添加认证token
    const token = localStorage.getItem('session_token')
    if (token) {
      config.headers['X-Authorization'] = token
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error_message || `HTTP error! status: ${response.status}`)
      }

      // 对于204 No Content响应，直接返回
      if (response.status === 204) {
        return {}
      }

      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  get(endpoint) {
    return this.request(endpoint)
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  }

  delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    })
  }
}

export const apiService = new ApiService()