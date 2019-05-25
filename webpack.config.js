const path = require('path');
const webpack = require('webpack');
const CheckerPlugin = require('awesome-typescript-loader').CheckerPlugin;
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
          loader: 'awesome-typescript-loader'
        }
      ]
    },

    plugins: [
      new CheckerPlugin(),
      new CopyWebpackPlugin([
        'package.json', 'README.md', 'CHANGELOG.md', 'LICENSE'
      ])
    ]
  }

  return config;
};
