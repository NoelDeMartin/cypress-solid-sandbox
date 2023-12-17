import soukai from '@aerogel/plugin-soukai';
import solid from '@aerogel/plugin-solid';
import { bootstrap } from '@aerogel/core';

import './assets/css/styles.css';
import App from './App.vue';
import { services } from './services';

bootstrap(App, {
    services,
    plugins: [
        soukai({ models: import.meta.glob(['@/models/*', '!**/*.test.ts'], { eager: true }) }),
        solid({ autoReconnect: true }),
    ],
});
