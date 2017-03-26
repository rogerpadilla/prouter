const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const helpers = require('./helpers');
const commonConfig = require('./webpack.common');

const ENV = process.env.ENV = process.env.NODE_ENV = 'dev';


module.exports = webpackMerge(commonConfig, {

  devtool: 'inline-source-map',

  plugins: [
    new webpack.DefinePlugin({
      'ENV': JSON.stringify(ENV),
      'process.env': {
        'ENV': JSON.stringify(ENV),
        'NODE_ENV': JSON.stringify(ENV)
      }
    }),
    new webpack.NamedModulesPlugin()
  ],

  devServer: {
    historyApiFallback: true,
    stats: 'minimal'
  }

});
