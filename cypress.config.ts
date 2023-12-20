import { defineConfig } from 'cypress';
import { setupSolidNodeEvents } from 'cypress-solid/config';

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:5001',
        setupNodeEvents: setupSolidNodeEvents,
    },
});
