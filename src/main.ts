import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import PrimeVue from 'primevue/config';

import Aura from '@primevue/themes/aura';
import ToastService from 'primevue/toastservice';

import 'primeicons/primeicons.css';

import './style.css';
import App from './App.vue';

const pinia = createPinia();

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./views/Home.vue'),
    },
  ],
});

createApp(App)
  .use(PrimeVue, { theme: { preset: Aura } })
  .use(ToastService)
  .use(pinia)
  .use(router)
  .mount('#app');
