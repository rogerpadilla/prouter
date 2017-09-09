const fs = require('fs');

const files = ['package.json', 'README.md', 'LICENSE'];

files.forEach(function (it) {
  fs.createReadStream(it).pipe(fs.createWriteStream('dist/' + it));
});
