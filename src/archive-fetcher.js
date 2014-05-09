/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var path = require('path');
var Q = require('q');

/**
 * Client to fetch and unpack xwalk-android zip files from URLs.
 * Note that this is just a convenience class which wraps {@link Unpacker}
 * and {@link Downloader} and writes their output to a logger.
 * You can use those classes separately if you need finer-grained control.
 * @constructor
 *
 * @param {object} [deps] - objects this class is dependent on
 * @param {Downloader} [deps.downloader=vanilla Downloader] - downloader
 * instance to use for HTTP requests
 * @param {Unpacker} [deps.unpacker=vanilla Unpacker] - unpacker for
 * zip files
 * @param {ConsoleLogger} [deps.logger=vanilla ConsoleLogger] - logger
 * to write messages to
 */
var ArchiveFetcher = function (deps) {
  if (!(this instanceof ArchiveFetcher)) {
    return new ArchiveFetcher(deps);
  }

  deps = deps || {};
  this.downloader = deps.downloader || require('./downloader')();
  this.unpacker = deps.unpacker || require('./unpacker')();
  this.logger = deps.logger || require('./console-logger')();
};

/**
 * Download and unpack an xwalk android distribution zip file.
 *
 * @param {string} archiveUrl - URL of xwalk-android .zip file to download
 * @param {string} outDir - directory to unpack the zip file to
 *
 * @returns {external:Promise} resolves to xwalkAndroidDir (the location
 * of the xwalk_app_template inside the unpacked directory);
 * the returned path is absolute and can be used to set the
 * xwalkAndroidDir property for the xwalk_apkgen script
 */
ArchiveFetcher.prototype.fetch = function (archiveUrl, outDir) {
  var self = this;
  var dfd = Q.defer();

  // compute the location of the directory into which the archive will
  // end up; this relies on the convention that the top-level directory
  // name inside the zip file matches the name of the zip file
  var xwalkUnpackedDir = path.basename(archiveUrl).replace('.zip', '');
  xwalkUnpackedDir = path.join(outDir, xwalkUnpackedDir);
  xwalkUnpackedDir = path.resolve(xwalkUnpackedDir);

  this.logger.log('starting download of ' + archiveUrl);

  this.downloader.download(archiveUrl, outDir)
  .then(
    function (downloadedFileLocation) {
      self.logger.log('\ndownload completed; file downloaded to ' +
                      downloadedFileLocation);
      return self.unpacker.unpack(downloadedFileLocation, outDir);
    },

    // need this here so I can add a progress handler
    dfd.reject,

    function (progress) {
      self.logger.replace(progress + '% complete');
    }
  )
  .done(
    function () {
      self.logger.log('xwalk-android zip file unpacked successfully\n');
      dfd.resolve(xwalkUnpackedDir);
    },

    dfd.reject
  );

  return dfd.promise;
};

module.exports = ArchiveFetcher;
