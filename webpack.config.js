switch (process.env.NODE_ENV) {
  case 'prod':
    module.exports = require('./config/webpack.prod');
    break;
  case 'dev':
  default:
    module.exports = require('./config/webpack.dev');
}
