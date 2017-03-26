const webpack = require('webpack');
const helpers = require('./helpers');
const ENV = process.env.ENV = process.env.NODE_ENV = 'test';


module.exports = {

  devtool: 'inline-source-map',

  resolve: {

    extensions: ['.ts', '.js'],

    /**
     * Make sure root is src
     */
    modules: [helpers.root('src'), 'node_modules']
  },

  module: {

    rules: [
      /**
       * Source map loader support for *.js files
       * Extracts SourceMaps for source files that as added as sourceMappingURL comment.
       *
       * See: https://github.com/webpack/source-map-loader
       */
      {
        enforce: 'pre',
        test: /\.js$/,
        loader: 'source-map-loader'
      },
      {
        test: /\.ts$/,
        loader: 'awesome-typescript-loader',
        query: {
          // use inline sourcemaps for "karma-remap-coverage" reporter
          sourceMap: false,
          inlineSourceMap: true,
          module: 'commonjs'
        },
        exclude: [/\.e2e\.ts$/]
      },

      /**
       * Instruments JS files with Istanbul for subsequent code coverage reporting.
       * Instrument only testing sources.
       *
       * See: https://github.com/deepsweet/istanbul-instrumenter-loader
       */
      {
        enforce: 'post',
        test: /\.(js|ts)$/,
        loader: 'istanbul-instrumenter-loader',
        include: helpers.root('src'),
        exclude: [
          /\.(e2e|spec)\.ts$/,
          /node_modules/
        ]
      }

    ]
  },

  plugins: [
    new webpack.DefinePlugin({
      'ENV': JSON.stringify(ENV),
      'process.env': {
        'ENV': JSON.stringify(ENV),
        'NODE_ENV': JSON.stringify(ENV)
      }
    }),
    new webpack.LoaderOptionsPlugin({
      debug: true
    })
  ]

};
