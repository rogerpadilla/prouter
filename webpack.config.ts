/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as path from 'path';
import { Configuration, ProgressPlugin } from 'webpack';
import * as CopyWebpackPlugin from 'copy-webpack-plugin';

type Mode = 'development' | 'production';
const mode = (process.env.NODE_ENV as Mode) ?? 'development';
const isProductionMode = mode === 'production';
console.debug('*** mode', mode);

const config: Configuration = {
  mode,

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
        exclude: /node_modules/,
        options: {
          configFile: 'tsconfig.build.json'
        }
      }
    ]
  },

  plugins: [new CopyWebpackPlugin({ patterns: ['package.json', 'README.md', 'LICENSE'] })]
};

if (isProductionMode) {
  config.plugins!.unshift(new ProgressPlugin());
}

module.exports = config;
