/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = function () {
  const config = {
    devtool: 'source-map',

    resolve: {
      extensions: ['.ts', '.js']
    },

    entry: {
      'prouter.min': './src/index.ts'
    },

    output: {
      path: path.resolve('dist'),
      publicPath: '/',
      filename: '[name].js',
      chunkFilename: '[id].chunk.js',
      library: 'prouter',
      libraryTarget: 'umd'
    },

    module: {
      rules: [
        /*
         * Source map loader support for *.js files
         * Extracts SourceMaps for source files that as added as sourceMappingURL comment.
         *
         * See: https://github.com/webpack/source-map-loader
         */
        {
          test: /\.js$/,
          use: 'source-map-loader',
          enforce: 'pre'
        },

        {
          test: /\.ts$/,
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.build.json'
          }
        }
      ]
    },

    plugins: [new CopyWebpackPlugin({ patterns: ['package.json', 'README.md', 'CHANGELOG.md', 'LICENSE'] })]
  };

  return config;
};
