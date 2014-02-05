/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var Q = require('q');
var path = require('path');
var fs = require('fs');
var AdmZip = require('adm-zip');
var zlib = require('zlib');
var tar = require('tar');
var shell = require('shelljs');

/**
 * Unpacks archive files (zip, tar, tar.gz, tgz).
 * @constructor
 */
var Unpacker = function () {
  if (!(this instanceof Unpacker)) {
    return new Unpacker();
  }
};

/**
 * <p>Unpack the archive at archiveFilePath to the directory outDir.
 * The top level elements in the archive will be children of outDir.</p>
 *
 * <p>Only files with a recognised suffix (.tar, .tar.gz, .tgz, .zip, .gz)
 * will be unpacked; anything else results in the returned promise
 * being rejected.</p>
 *
 * <p>A tarball file (.tgz or .tar.gz) will be gunzipped then untarred;
 * the intermediate tarball will be removed to just leave the unpacked
 * content of the tarball behind.</p>
 *
 * @param {string} archiveFilePath - path to the archive file to unpack
 * @param {string} outDir - path to the output directory which the
 * archive should be unpacked to
 *
 * @returns {external:Promise} resolves if the unpacking is successful,
 * or is rejected if not
 */
Unpacker.prototype.unpack = function (archiveFilePath, outDir) {
  var self = this;
  var dfd = Q.defer();
  var promise = dfd.promise;

  if (!fs.existsSync(archiveFilePath)) {
    dfd.reject(new Error('file at ' + archiveFilePath + ' does not exist'));
    return promise;
  }
  else if (!fs.statSync(archiveFilePath).isFile()) {
    dfd.reject(new Error('entry at ' + archiveFilePath + ' is not a file'));
    return promise;
  }

  var suffix = path.extname(archiveFilePath);

  var unpackCmd = null;

  // NB unpackCmd should resolve dfd when done
  if (suffix === '.zip') {
    unpackCmd = function () {
      var overwrite = true;
      var zip = new AdmZip(archiveFilePath);
      zip.extractAllTo(outDir, overwrite);
      dfd.resolve();
    };
  }
  else if (suffix === '.gz' || suffix === '.tgz') {
    unpackCmd = function () {
      var gunzip = zlib.createGunzip();

      var outputFilePath = archiveFilePath.replace(suffix, '');

      var isTarball = false;
      if (suffix === '.tgz') {
        outputFilePath += '.tar';
        isTarball = true;
      }
      else if (/\.tar$/.test(outputFilePath)) {
        isTarball = true;
      }

      // gzipped tar files get unpacked to a temporary .tar filename
      // in the same directory as the original tarball, to avoid overwriting
      // any existing .tar files in the same directory; the intermediate
      // tarball is removed once it has been unpacked, though the
      // original gzipped tar file is left alone
      var newSuffix = '.xwalk-apk-gen.unpacker-tmp.' +
                      ((new Date()).getTime()) + '.tar';
      outputFilePath = outputFilePath.replace('.tar', newSuffix);

      var inp = fs.createReadStream(archiveFilePath);
      var out = fs.createWriteStream(outputFilePath);

      // when we finish gunzipping, pass through again if the output
      // file is a tar file
      out.on('finish', function () {
        if (isTarball) {
          self.unpack(outputFilePath, outDir)
          .then(
            function () {
              // remove the intermediate .tar file
              shell.rm(outputFilePath);

              dfd.resolve();
            },

            dfd.reject
          );
        }
        else {
          dfd.resolve();
        }
      });

      inp.pipe(gunzip).pipe(out);
    };
  }
  else if (suffix === '.tar') {
    unpackCmd = function () {
      var inp = fs.createReadStream(archiveFilePath);

      var tarStream = tar.Extract(outDir);
      tarStream.on('error', dfd.reject);
      tarStream.on('end', dfd.resolve);

      inp.pipe(tarStream);
    };
  }

  if (unpackCmd) {
    try {
      unpackCmd();
    }
    catch (e) {
      dfd.reject(e);
    }
  }
  else {
    dfd.reject(new Error('file suffix ' + suffix + ' was not recognised'));
  }

  return promise;
};

module.exports = function () {
  return new Unpacker();
};
