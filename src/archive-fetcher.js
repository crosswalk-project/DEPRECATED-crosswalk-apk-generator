/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var path = require('path');
var Q = require('q');

// NB if the structure of the tarballs changes, this might have to change too

/**
 * Client to fetch and unpack xwalk-android tarballs/zip files from URLs.
 * Note that this is just a convenience class which wraps {@link Unpacker}
 * and {@link Downloader} and writes their output to a logger.
 * You can use those classes separately if you need finer-grained control.
 * @constructor
 *
 * @param {object} [deps] - objects this class is dependent on
 * @param {Downloader} [deps.downloader=vanilla Downloader] - downloader
 * instance to use for HTTP requests
 * @param {Unpacker} [deps.unpacker=vanilla Unpacker] - unpacker for
 * zip files and tarballs
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
 * Download and unpack an xwalk android distribution zip file,
 * then unpack the xwalk app template tarball inside it.
 *
 * @param {string} archiveUrl - URL of xwalk-android .zip file to download
 * @param {string} tarballName - name of the xwalk_app_template tarball
 * inside the downloaded + unpacked xwalk-android directory; this will
 * usually be xwalk_app_template.tar.gz
 * @param {string} outDir - directory to unpack the zip file to; note
 * that the xwalk app template tarball inside the unpacked zip
 * directory will also be unpacked
 *
 * @returns {external:Promise} resolves to xwalkAndroidDir (the location
 * of the xwalk_app_template inside the unpacked directory);
 * the returned path is absolute and can be used to set the
 * xwalkAndroidDir property for the xwalk_apkgen script
 */
ArchiveFetcher.prototype.fetch = function (archiveUrl, tarballName, outDir) {
  var self = this;
  var dfd = Q.defer();

  // compute the location of the directory into which the archive will
  // end up; this relies on the convention that the top-level directory
  // name inside the zip file matches the name of the zip file
  var xwalkUnpackedDir = path.basename(archiveUrl).replace('.zip', '');
  xwalkUnpackedDir = path.join(outDir, xwalkUnpackedDir);
  xwalkUnpackedDir = path.resolve(xwalkUnpackedDir);

  // where the template tarball will be inside the unpacked xwalk-android
  var tarballPath = path.join(xwalkUnpackedDir, tarballName);

  // where the template directory will be after the template tarball
  // is unpacked
  var templateDir = tarballPath.replace('.tar.gz', '');

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
  .then(
    function () {
      self.logger.log('xwalk-android zip file unpacked successfully\n' +
                      'unpacking app template tarball');

      return self.unpacker.unpack(tarballPath, xwalkUnpackedDir);
    }
  )
  .done(
    function () {
      self.logger.log('app template tarball unpacked successfully');
      dfd.resolve(templateDir);
    },

    dfd.reject
  );

  return dfd.promise;
};

module.exports = ArchiveFetcher;
