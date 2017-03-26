const webpack = require('webpack');
const CheckerPlugin = require('awesome-typescript-loader').CheckerPlugin;
const helpers = require('./helpers');


module.exports = {

  resolve: {
    extensions: ['.ts', '.js'],
    modules: ['node_modules']
  },

  entry: {
    'main': './src/index.ts'
  },

  output: {
    path: helpers.root('dist'),
    publicPath: '/',
    filename: '[name].js',
    chunkFilename: '[id].chunk.js'
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'tslint-loader',
        enforce: 'pre'
      },
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
        loader: 'awesome-typescript-loader',
        exclude: /\.(spec|e2e)\.ts$/
      }
    ]
  },

  plugins: [
    new webpack.LoaderOptionsPlugin({
      debug: true,
      options: {
        tslint: {
          emitErrors: false,
          failOnHint: false,
          resourcePath: 'src'
        }
      }
    }),
    new CheckerPlugin(),
    new webpack.optimize.CommonsChunkPlugin({
      name: ['main']
    })
  ]

};
