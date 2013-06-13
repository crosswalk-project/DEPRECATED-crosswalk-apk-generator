require('chai').should();

var path = require('path');
var dataDir = path.join(__dirname, 'data');

var fileLister = require('../../lib/file-lister');

describe('file lister', function () {
  it('should list files in time order', function () {
    var latest = fileLister.getLatest([
      path.join(dataDir, 'older.txt'),
      path.join(dataDir, 'oldest.txt'),
      path.join(dataDir, 'youngest.txt')
    ]);

    latest.should.equal(path.join(dataDir, 'youngest.txt'));
  });
});
