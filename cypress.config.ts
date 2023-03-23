/* eslint @typescript-eslint/no-var-requires: "off" */
import { defineConfig } from 'cypress';

export default defineConfig({
  viewportHeight: 800,
  viewportWidth: 1100,
  component: {
    setupNodeEvents(on, config) {
      require('@cypress/code-coverage/task')(on, config);
      // include any other plugin code...

      // It's IMPORTANT to return the config object
      // with any changed environment variables
      return config;
    },
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
  },
});
