
var path = require('path');
var fs = require('fs');

var cache = {};

module.exports = function (theme, fn) {
  if(cache[theme]) {
    process.nextTick(function () {
      fn(null, cache[theme]);
    });

    return;
  }

  fs.readFile(path.join(__dirname, path.dirname(require.resolve('humane-js')), 'themes', theme), 'utf8', function (err, css) {
    if(err) return fn(err);

    cache[theme] = css;

    fn(null, css);
  });
};

