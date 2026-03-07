import { defineConfig } from 'cypress';

module.exports = defineConfig({
  viewportHeight: 800,
  viewportWidth: 1100,
  chromeWebSecurity: false,
  component: {
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    experimentalCoverage: true,
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
});
