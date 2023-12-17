import installSolid from 'cypress-solid/plugin';
import { defineConfig } from 'cypress';

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:5001',
        setupNodeEvents(on) {
            installSolid(on);
        },
    },
});
