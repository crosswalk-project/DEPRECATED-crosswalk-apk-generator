var fs = require('fs');

/**
 * Local filesystem listing
 */
module.exports = {
  // stat the files in filePaths and return the latest (NB this
  // uses node to process the directory, not ls)
  getLatest: function (filePaths) {
    if (filePaths.length > 1) {
      // sort so latest file is first in the list
      var sortFn = function(a, b) {
        var aTime = fs.statSync(a).mtime.getTime();
        var bTime = fs.statSync(b).mtime.getTime();
        return bTime - aTime;
      }

      filePaths = filePaths.sort(sortFn);
    }

    return filePaths[0];
  }
};
