import '@cypress/instrument-cra';
import { defineConfig } from 'cypress';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const codeCoverageTask = require('@cypress/code-coverage/task');

module.exports = defineConfig({
  viewportHeight: 800,
  viewportWidth: 1100,
  component: {
    setupNodeEvents(on, config) {
      return Object.assign({}, config, codeCoverageTask(on, config));
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
      webpackConfig: {
        devServer: {
          port: 3001,
        },
        mode: 'development',
        devtool: false,
        module: {
          rules: [
            {
              test: /\.tsx$/,
              exclude: /node_modules/,
              use: {
                loader: 'babel-loader',
                options: {
                  presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
                  plugins: ['istanbul', ['@babel/plugin-transform-modules-commonjs', { loose: true }]],
                },
              },
            },
          ],
        },
      },
    },
  },
});
