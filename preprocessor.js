const tsc = require('typescript');
const tsConfig = require('./tsconfig.json');

tsConfig.compilerOptions.module = 'commonjs';
tsConfig.compilerOptions.sourceMap = false;
tsConfig.compilerOptions.inlineSourceMap = true;

module.exports = {
  process(src, path) {
    if (path.endsWith('.ts')) {
      return tsc.transpile(src, tsConfig.compilerOptions, path, []);
    }
    return src;
  },
};
