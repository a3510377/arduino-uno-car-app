import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';

import Aura from '@primevue/themes/aura';
import ToastService from 'primevue/toastservice';

import 'primeicons/primeicons.css';

import './style.css';
import App from './App.vue';
import Ripple from 'primevue/ripple';

const pinia = createPinia();

createApp(App)
  .use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        darkModeSelector: '.dark',
      },
    },
  })
  .directive('ripple', Ripple) // fix for vue-warn
  .use(ToastService)
  .use(pinia)
  .mount('#app');
