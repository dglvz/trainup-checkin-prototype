import { createRouter, createWebHashHistory } from 'vue-router'

// Hash history: GitHub Pages no reescribe rutas, así que recargar
// `/#/admin/105` nunca da 404.
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
    { path: '/client', name: 'client', component: () => import('./views/ClientSelectView.vue') },
    {
      path: '/client/:userId(\\d+)',
      name: 'client-pass',
      component: () => import('./views/ClientPassView.vue'),
      props: true,
    },
    { path: '/admin', name: 'admin', component: () => import('./views/AdminSelectView.vue') },
    {
      path: '/admin/:adminId(\\d+)',
      name: 'admin-scanner',
      component: () => import('./views/AdminScannerView.vue'),
      props: true,
    },
    { path: '/settings', name: 'settings', component: () => import('./views/SettingsView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router
