/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var path = require('path');

var Q = require('q');
var glob = require('glob');
var _ = require('lodash');

var pathHelpers = require('./path-helpers');
var fixSeparators = pathHelpers.fixSeparators;
var stripTrailingSeparators = pathHelpers.stripTrailingSeparators;

/*
 * Create an array of likely names for a binary for a particular
 * platform, with the most likely first.
 * For example, given "aapt" as name, return ["aapt"] on Linux
 * and ["aapt.exe", "aapt.bat", "aapt"] on Windows
 *
 * name: the name of a binary, e.g. "aapt"
 */
var getLikelyBinaryNames = function (name, platform) {
  if (/^win/.test(platform)) {
    return [name + '.exe', name + '.bat', name];
  }
  else {
    return [name];
  }
};

/*
 * Create a "master" promise which resolves when any of the promise-returning
 * functions in promiseFuncs resolves; the first one "wins". If all
 * the promises returned by the functions in promiseFuncs are
 * rejected, the master promise is rejected with the last error
 * that occurred.
 *
 * returns the master promise; this resolves to the result of the "winning"
 * promise
 */
var anyResolves = function (promiseFuncs, lastError) {
  var dfd = Q.defer();

  if (promiseFuncs.length === 0) {
    dfd.reject(lastError);
    return dfd.promise;
  }

  var promiseFunc = promiseFuncs.shift();
  var promise = promiseFunc();

  promise.then(
    dfd.resolve,

    // if the promise is rejected, recursively try again with the next
    // promise in the array; note that we call anyResolves with the
    // last error that occurred
    function (e) {
      anyResolves(promiseFuncs, e).then(dfd.resolve, dfd.reject);
    }
  );

  return dfd.promise;
};

// method: 'isDirectory' or 'isFile'; method on the Stats
// object to call to check the type of file;
// resolves to the path or to false if the path was not found or
// the found item was of the wrong type (e.g. it was a file when a
// directory was expected)
var checkPath = function (pathToTest, fs, method) {
  var dfd = Q.defer();
  var promise = dfd.promise;

  if (!pathToTest) {
    dfd.reject(new Error('could not check path as it was not set'));
    return promise;
  }

  pathToTest = path.resolve(pathToTest);

  glob(pathToTest, function (err, found) {
    if (err) {
      dfd.reject(err);
    }
    else if (found.length === 0) {
      dfd.resolve(false);
    }
    else {
      // take the alphabetically-last item from the found array
      var alphaLast = _.last(found);

      fs.stat(alphaLast, function (err, stats) {
        if (err) {
          dfd.reject(err);
        }
        else if (stats[method]()) {
          dfd.resolve(fixSeparators(alphaLast));
        }
        else {
          dfd.resolve(false);
        }
      });
    }
  });

  return promise;
};

// make a function which returns a promise that resolves to a single
// file, or rejects if an error occurs or more than one path is returned;
// the glob tried is added to the array tried
var makeGlobFn = function (globFiles, pattern, tried) {
  tried = tried || [];

  return function () {
    var dfd = Q.defer();

    globFiles(pattern)
    .done(
      function (files, pattern) {
        tried.push(pattern);

        if (files.length === 0) {
          dfd.reject(tried);
        }
        else {
          dfd.resolve(files);
        }
      },

      dfd.reject
    );

    return dfd.promise;
  };
};

// returning a promise which resolves to one or more candidate paths;
// if no matches are found, promise is rejected; if an error occurs,
// the promise is rejected with that error
var makeGuessPathFn = function (guessPath) {
  return function () {
    var dfd = Q.defer();

    glob(guessPath, function (err, results) {
      if (err) {
        dfd.reject(err);
      }
      else if (results.length === 0) {
        dfd.reject();
      }
      else {
        // fix the separators (glob() always returns forwards slashes)
        results = _.map(results, fixSeparators);
        dfd.resolve(results);
      }
    });

    return dfd.promise;
  };
};

/**
 * Finds and tests files and executables.
 * @constructor
 *
 * @param {object} options
 * @param {string} [options.platform=require('os').platform()] - set
 * the platform the Finder is running on, e.g. "win32" or "linux"
 * @param {CommandRunner} [options.commandRunner=non-verbose CommandRunner] -
 * {@link CommandRunner} used for testing executables
 * @param {object} [options.fs=require('fs')] - filesystem implementation
 */
var Finder = function (options) {
  if (!(this instanceof Finder)) {
    return new Finder(options);
  }

  options = options || {};
  this.platform = options.platform || require('os').platform();
  this.commandRunner = options.commandRunner || require('./command-runner')(false);
  this.fs = options.fs || require('fs');
};

/**
 * Check whether pathToTest exists and is a file.
 *
 * @param {string} pathToTest
 *
 * @returns {external:Promise} resolves to true if path is a file, or false
 * if not; rejects if pathToTest is not specified
 */
Finder.prototype.checkIsFile = function (pathToTest) {
  return checkPath(pathToTest, this.fs, 'isFile');
};

/**
 * Check whether pathToTest exists and is a directory.
 *
 * @param {string} pathToTest
 *
 * @returns {external:Promise} resolves to true if path is a directory, or
 * false if pathToTest does not exist or is a file; promise is rejected
 * with an error if pathToSet is not valid
 */
Finder.prototype.checkIsDirectory = function (pathToTest) {
  return checkPath(pathToTest, this.fs, 'isDirectory');
};

/**
 * Check that "path" is an executable file, and that its output
 * matches the regexp "required".
 *
 * @param {string} exe - executable to test
 * @param {string[]} args - arguments to pass to the executable
 * @param {regex} [required] - after calling exe + args, test its
 * output against this regular expression, and only resolve if the
 * test passes; otherwise, reject
 * @param {boolean} ignoreErrors - if true, even if the command throws
 * an error (returns non-zero result), the regular expression match
 * is still done to check the output (stderr and stdout); this is used
 * for tools which may be buggy and return 1 even if they are
 * working correctly (e.g. jarsigner in Oracle Java 6 JDK)
 *
 * @returns {external:Promise} resolves to the command's output
 * if the check is OK (i.e. the executable exe run with args returns
 * without an error, or with an error but ignoreErrors is on,
 * and the required regex tests successfully); or rejects if the test fails
 */
Finder.prototype.checkExecutable = function (exe, args, required, ignoreErrors) {
  var dfd = Q.defer();
  args = args || [];

  if (typeof required === 'string') {
    required = new RegExp(required, 'm');
  }

  this.commandRunner.run(exe + ' ' + args.join(' '))
  .done(
    function (output) {
      if (!required || required.test(output)) {
        dfd.resolve(output);
      }
      else {
        dfd.reject(new Error('output\n' + output + ' from ' + exe +
                             ' did not match required regex ' + required));
      }
    },

    function (err) {
      if (!ignoreErrors) {
        dfd.reject(err);
      }
      else if (!required || required.test(err.message)) {
        dfd.resolve(err.message);
      }
      else {
        dfd.reject(err);
      }
    }
  );

  return dfd.promise;
};

/**
 * Find files matching the pattern under directory rootDir.
 *
 * @param {string} rootDir - root directory to search inside
 * @param {string} pattern - pattern to find; NB glob() patterns MUST
 * use forward slashes, even on Windows; if you only want directories,
 * ensure that this ends with '/'
 *
 * @returns {external:Promise} resolves to (files, pattern), where
 * files is the array of files found which match "file" under rootDir
 * and pattern the matched pattern; or rejects with an error if the
 * search throws an error; note that this may resolve to an empty
 * array if no matching files are found; also not that if
 * isDirectory == true, a trailing slash is added to the search pattern,
 * so only directories will be returned
 */
Finder.prototype.globFiles = function (pattern) {
  var dfd = Q.defer();

  // TODO test rootDir is actually a directory

  glob(pattern, function (err, files) {
    if (err) {
      dfd.reject(err);
    }
    else {
      // glob always returns matches with forward slashes as path
      // separators, so we ensure that they are converted to OS-specific
      // separators here
      var fixedFiles = _.map(files, function (file) {
        return fixSeparators(file);
      });

      dfd.resolve(fixedFiles);
    }
  });

  return dfd.promise;
};

/**
 * Find directories under rootDir by globbing.
 *
 * @param {string} rootDir - root directory to search inside
 * @param {string[]} dir - directory to find
 * @param {string[]} tried - directories/globs already tried (mainly used
 * as an accumulator for recursive calls)
 *
 * @returns {external:Promise} resolves to directory
 * found (always with a trailing path separator), rejects with an
 * error if the glob throws an error or if no matching directory is found
 */
Finder.prototype.findDirectories = function (rootDir, dir, tried) {
  tried = tried || [];
  var self = this;
  var dfd = Q.defer();

  var globFn = makeGlobFn(
    this.globFiles.bind(this),
    stripTrailingSeparators(rootDir) + '/**/' + stripTrailingSeparators(dir) + '/'
  );

  globFn()
  .done(
    function (results) {
      // check each item in results represents a directory
      var checkedResultPromises = _.map(results, function (result) {
        return self.checkIsDirectory(result)
        .then(
          function (isDir) {
            if (isDir) {
              // ensure that the result path has a trailing path separator
              result = stripTrailingSeparators(result);
              result += path.sep;
              return result;
            }
            else {
              tried.push(result);
              return Q.reject();
            }
          }
        );
      });

      Q.all(checkedResultPromises)
      .done(
        dfd.resolve,

        function () {
          dfd.reject(tried);
        }
      );
    },

    dfd.reject
  );

  return dfd.promise;
};

/**
 * <p>Try to find files by guessing then by globbing.</p>
 *
 * <p>The search checks each of the possible file names for
 * each of the possible directories under the root directory
 * where we guess it could be; if that fails, the search
 * does a glob for each of the possible file names under the
 * root directory we're searching in.</p>
 *
 * <p>For example, if rootDir = '/foo',
 * guessDirs = ['bar/tools', 'maz/tools'], and
 * possibleNames = ['aapt.exe', 'aapt.bat', 'aapt'], the search goes:</p>
 *
 * <ul>
 *   <li>test for '/foo/bar/tools/aapt.exe'</li>
 *   <li>test for '/foo/maz/tools/aapt.exe'</li>
 *   <li>test for '/foo/bar/tools/aapt.bat'</li>
 *   <li>test for '/foo/maz/tools/aapt.bat'</li>
 *   <li>test for '/foo/bar/tools/aapt'</li>
 *   <li>test for '/foo/maz/tools/aapt'</li>
 *   <li>search for files matching 'aapt.exe' under '/foo'</li>
 *   <li>search for files matching 'aapt.bat' under '/foo'</li>
 *   <li>search for files matching 'aapt' under '/foo'</li>
 * </ul>
 *
 * @param {string} rootDir - root directory to search inside
 * @param {string[]} guessDirs - most likely directories under rootDir
 * where file will be located
 * @param {string[]} possibleNames - possible names for the file
 * @param {boolean} versionSort - if true, and multiple possible file
 * matches are returned, sort by version of the parent directory using
 * semver; if false, just take the alphabetically-last item
 *
 * @returns {external:Promise} resolves to the verified file location
 * (if found) or is rejected with an error if the search fails (either
 * because the glob threw an error, no files were found); the returned
 * error is the last error recorded while searching for the files (if
 * one occurs) or an array of the tried file paths
 */
Finder.prototype.findFiles = function (rootDir, guessDirs, possibleNames, tried) {
  tried = tried || [];
  var self = this;
  var dfd = Q.defer();

  // this array will contain functions; each function returns a promise that
  // resolves to a found path, if the path is found;
  // we are interested in the first one which resolves successfully
  var tries = [];

  for (var i = 0; i < possibleNames.length; i += 1) {
    for (var j = 0; j < guessDirs.length; j += 1) {
      var guessPath = path.join(rootDir, guessDirs[j], possibleNames[i]);
      tried.push(guessPath);

      // make a function which tries the guessPath
      var guessFn = makeGuessPathFn(guessPath);

      tries.push(guessFn);
    }
  }

  // try the guess paths until one resolves
  anyResolves(tries)
  .then(
    dfd.resolve,

    // none of the guesses worked, so try globs instead
    function () {
      tries = [];

      for (var i = 0; i < possibleNames.length; i += 1) {
        var globFn = makeGlobFn(
          self.globFiles.bind(self),
          stripTrailingSeparators(rootDir) + '/**/' + possibleNames[i],
          tried
        );

        tries.push(globFn);
      }

      return anyResolves(tries);
    }
  )
  .done(
    dfd.resolve,

    function () {
      dfd.reject(tried);
    }
  );

  return dfd.promise;
};

/**
 * Find binaries and other files required to build an apk.
 *
 * @param {string} rootDir - directory to start looking inside
 * @param {object} pieces - an object which maps a generic name to one or more
 * possible filenames, with a guessDir representing its likely
 * location, e.g.
 *
 * <pre>
 * {
 *   // for a single file
 *   aapt: {
 *     (files: ['foo.jar', 'foo-bar.jar'] ||
 *      exe: 'aapt'),
 *     guessDir: 'build-tools/18.0.1',
 *     filter: function (results) {
 *       // custom filter function to return a single file from those
 *       // found; if not set, the last file in the array of candidates
 *       // is returned
 *     }
 *   },
 *
 *   // for resource directories
 *   xwalkResources: {
 *     resDirs: ['path1', 'path2', ...],
 *     libs: ['path3', ...],
 *     pkg: 'my.package' // package for R.java
 * }
 * </pre>
 *
 * <p>If the files property is set for a piece, the files are searched
 * for in the order they appear in the array.
 *
 * <p>If the exe property is set, the most likely executable name
 * (dependent on the platform) is tried first, then alternatives; so
 * on Windows, if exe were 'aapt', the Finder would first look for
 * 'aapt.exe' then 'aapt.bat' then 'aapt'; on Linux, the Finder would
 * just look for 'aapt'.</p>
 *
 * <p>For each file or exe, the best guess location for a binary (as suggested
 * by guessDir) is tried first; if that doesn't return anything, a
 * glob search is done instead.</p>
 *
 * <p>If the key is set to an array, the Finder treats each string
 * in the array as a directory name, and attempts to find it  under
 * rootDir. If all directories are found, the resulting paths are
 * returned; if any one fails, its path is set to '!!!NOT FOUND!!!'
 * and the whole set is rejected.</p>
 *
 * @returns {external:Promise} resolves to the found locations of
 * the pieces, e.g.
 *
 * <pre>
 * {
 *   'aapt': '/path/to/aapt',
 *   'zipalign': '/path/to/zipalign',
 *   'xwalkResources: ['/path/1', '/path/2', ...]
 * }
 * </pre>
 *
 * <p>If any pieces can't be found, its location is set to
 * '!!!NOT FOUND!!!' + paths tried and the promise is rejected with an error
 * showing all the locations found up to the point of failure,
 * including the failed one.</p>
 */
Finder.prototype.locatePieces = function (rootDir, pieces) {
  var self = this;
  var dfd = Q.defer();
  var locations = {};
  var locationPromises = [];

  _.each(pieces, function (properties, alias) {
    var promise;

    // search for resource directories
    if (_.isArray(properties.resDirs)) {
      locations[alias] = properties;

      var resDirsPromises = [];
      var libDirsPromises = [];

      _.each(properties.resDirs, function (dirPath) {
        var resDirPromise = self.findDirectories(rootDir, dirPath).then(_.last);
        resDirsPromises.push(resDirPromise);
      });

      var resDirsCombinedPromise = Q.all(resDirsPromises);

      resDirsCombinedPromise.done(
        function (paths) {
          locations[alias].resDirs = paths;
        }
      );

      _.each(properties.libs, function (dirPath) {
        var libDirPromise = self.findDirectories(rootDir, dirPath).then(_.last);
        libDirsPromises.push(libDirPromise);
      });

      var libDirsCombinedPromise = Q.all(libDirsPromises);

      libDirsCombinedPromise.done(
        function (paths) {
          locations[alias].libs = paths;
        }
      );

      promise = Q.all([resDirsCombinedPromise, libDirsCombinedPromise]);
    }
    // search for directory
    else if (properties.directory) {
      promise = self.findDirectories(rootDir, properties.directory);

      promise.then(
        function (results) {
          locations[alias] = _.last(results);
        },

        function (tried) {
          locations[alias] = '!!!NOT FOUND!!!; tried these paths:\n' +
                             tried.join('\n');
        }
      );
    }
    // search for file or binary
    else {
      var guessDirs = properties.guessDirs;

      var files = properties.files ||
                  getLikelyBinaryNames(properties.exe, self.platform);

      // return the last item in the array of found files if no custom
      // filter was specified
      var filter = properties.filter || _.last;

      promise = self.findFiles(rootDir, guessDirs, files);

      promise.then(
        function (files) {
          locations[alias] = filter(files);
        },

        function (tried) {
          locations[alias] = '!!!NOT FOUND!!!; tried these paths:\n' +
                             tried.join('\n');
        }
      );
    }

    // we return the first location which resolves successfully
    locationPromises.push(promise);
  });

  Q.all(locationPromises)
  .done(
    function () {
      dfd.resolve(locations);
    },

    function () {
      var msg = 'could not find all required locations\nFind results:\n';
      _.each(locations, function (path, alias) {
        msg += alias + '=' + path + '\n';
      });
      dfd.reject(new Error(msg));
    }
  );

  return dfd.promise;
};

module.exports = Finder;
