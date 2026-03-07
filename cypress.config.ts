import { defineConfig } from 'cypress';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const codeCoverageTask = require('@cypress/code-coverage/task');

module.exports = defineConfig({
  viewportHeight: 800,
  viewportWidth: 1100,
  chromeWebSecurity: false,
  component: {
    setupNodeEvents(on, config) {
      return Object.assign({}, config, codeCoverageTask(on, config));
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
});
