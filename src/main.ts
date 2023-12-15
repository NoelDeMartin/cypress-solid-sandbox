import i18n from '@aerogel/plugin-i18n';
import soukai from '@aerogel/plugin-soukai';
import { bootstrap } from '@aerogel/core';

import './assets/css/styles.css';
import App from './App.vue';
import solid from '@aerogel/plugin-solid';

bootstrap(App, {
    plugins: [
        i18n({ messages: import.meta.glob('@/lang/*.yaml') }),
        soukai({ models: import.meta.glob(['@/models/*', '!**/*.test.ts'], { eager: true }) }),
        solid({ autoReconnect: true }),
    ],
});
