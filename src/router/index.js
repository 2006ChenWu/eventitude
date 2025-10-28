import { createRouter, createWebHistory } from 'vue-router'
import { authService } from '../services/auth.service'

// 页面组件
import Home from '../pages/Home.vue'
import Login from '../pages/Login.vue'
import EventDetail from '../pages/EventDetail.vue'
import CreateEvent from '../pages/CreateEvent.vue'
import Profile from '../pages/Profile.vue'

// 路由守卫
const ifAuthenticated = (to, from, next) => {
  if (authService.isAuthenticated()) {
    next()
    return
  }
  next('/login')
}

const ifNotAuthenticated = (to, from, next) => {
  if (!authService.isAuthenticated()) {
    next()
    return
  }
  next('/')
}

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    beforeEnter: ifNotAuthenticated
  },
  {
    path: '/event/:id',
    name: 'EventDetail',
    component: EventDetail
  },
  {
    path: '/create-event',
    name: 'CreateEvent',
    component: CreateEvent,
    beforeEnter: ifAuthenticated
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    beforeEnter: ifAuthenticated
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router