/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

// a real Finder, which we just use to help with tests
var path = require('path');
var crypto = require('crypto');
var fs = require('fs');

var shell = require('shelljs');
var Q = require('q');
var _ = require('lodash');
var glob = require('glob');

var fixsep = require('../../src/path-helpers').fixSeparators;
var finder = require('../../src/finder')();

// to avoid issues where digests are wrong because of different
// line endings, where filePath refers to a text file, strip out
// all line end characters
var textExtensions = ['.xml', '.js', '.java', '.html', '.css', '.md',
                      '.txt', '.less', '.json'];
var textFilenames = ['LICENSE'];

var getContent = function (filePath) {
  var isTextFile = _.contains(textExtensions, path.extname(filePath)) ||
                   _.contains(textFilenames, path.basename(filePath));
  if (isTextFile) {
    var content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/[\n\r]/g, '');
    return content;
  }
  else {
    return fs.readFileSync(filePath);
  }
};

// get a list of files under dir, returning them as a promise
// which resolves to a sorted list; note that the filenames in the
// returned list are sorted and relative to the initial dir, to make
// comparisons between directories easier
var globDirectory = function (dir) {
  var dfd = Q.defer();

  glob(dir + '/**', function (err, files) {
    if (err) {
      dfd.reject(err);
    }
    else {
      files = files.sort();
      files = _.map(files, function (file) {
        return path.relative(dir, file);
      });
      dfd.resolve(files);
    }
  });

  return dfd.promise;
};

// create a SHA256 digest of a file (for comparing binary files);
// pass either a full path to the file, or multiple path parts
var createDigest = function () {
  var filePath = arguments[0];

  if (arguments.length > 1) {
    filePath = path.join.apply(null, _.toArray(arguments));
  }

  var content = getContent(filePath);
  var hash = crypto.createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
};

// compare two directories, resolving to true if their content
// matches (i.e. each has the same subtree underneath, containing
// files with matching digests) or rejecting if not; any differences
// are reported with respect to the expected directory
var compareDirectories = function (expected, actual) {
  var dfd = Q.defer();

  Q.all([
    globDirectory(expected),
    globDirectory(actual)
  ])
  .done(
    function (results) {
      var expectedFiles = results[0];
      var actualFiles = results[1];

      var error = '';

      var filesMissing = _.difference(expectedFiles, actualFiles);
      var filesExtra = _.difference(actualFiles, expectedFiles);

      if (filesMissing.length > 0) {
        error += 'actual dir ' + actual +
	         ' is missing ' + filesMissing.length + ' files:\n' +
                 filesMissing.join('\n') + '\n';
      }

      if (filesExtra.length > 0) {
        error += 'actual dir ' + actual + ' has ' +
	         filesExtra.length + ' extra files:\n' +
                 filesExtra.join('\n');
      }

      // there are no differences, so compare the files one by one
      if (error === '') {
        for (var i = 0; i < expectedFiles.length; i += 1) {
          var expectedFile = path.join(expected, expectedFiles[i]);
          var actualFile = path.join(actual, actualFiles[i])

          if (fs.existsSync(expectedFile) && fs.statSync(expectedFile).isFile()) {
            var expectedHash = createDigest(expectedFile);
            var actualHash = createDigest(actualFile);

            if (expectedHash !== actualHash) {
              error += 'hashes for file ' + expectedFiles[i] + ' did not match\n' +
                       'expected: ' + expectedHash + '\n' +
                       'actual: ' + actualHash + '\n';
            }
          }
        }
      }

      if (error === '') {
        dfd.resolve();
      }
      else {
        dfd.reject(new Error(error));
      }
    },

    dfd.reject
  );

  return dfd.promise;
};

// returns a promise which is rejected if the file check fails
// (Finder.checkIsFile() just resolves to false)
var checkFile = function (outDir) {
  var dfd = Q.defer();

  var pathPieces = _.rest(arguments);

  var pathToTest = path.join.apply(null, [outDir].concat(pathPieces));

  finder.checkIsFile(pathToTest)
  .then(
    function (result) {
      if (result) {
        dfd.resolve();
      }
      else {
        dfd.reject(new Error('could not find path ' + pathToTest));
      }
    },

    dfd.reject
  );

  return dfd.promise;
};

var cleanDir = function (outDir) {
  if (shell.test('-d', outDir)) {
    shell.rm('-r', outDir);
  }
};

var mkDir = function (outDir) {
  shell.mkdir('-p', outDir);
};

module.exports = {
  createDigest: createDigest,
  compareDirectories: compareDirectories,
  checkFile: checkFile,
  cleanDir: cleanDir,
  mkDir: mkDir
};
