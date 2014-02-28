/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

// test unpacking a zip file
var path = require('path');
var fs = require('fs');

var sinon = require('sinon');
var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();

var shell = require('shelljs');
var Q = require('q');

var fsHelpers = require('./fs.helpers');
var unpacker = require('../../src/unpacker')();

var testArchivesDir = path.join(__dirname, 'test-archives');
var notzipFileName = path.join(testArchivesDir, 'TEST.notzip');
var gzippedTextFileName = path.join(testArchivesDir, 'TEST.txt.gz');
var zipFileName = path.join(testArchivesDir, 'TEST.zip');
var tgzFileName = path.join(testArchivesDir, 'TEST.tgz');
var tarFileName = path.join(testArchivesDir, 'TEST.tar');

// this directory has the same content as the archive files and
// is used to do a comparison
var comparisonDir = path.join(testArchivesDir, 'TEST');

var outDir = path.join(__dirname, 'build', 'unpacker.test');

describe('Unpacker', function () {

  beforeEach(function () {
    fsHelpers.cleanDir(outDir);
    fsHelpers.mkDir(outDir);
  });

  after(function () {
    fsHelpers.cleanDir(outDir);
  });

  it('should reject files with an unrecognised suffix', function (done) {
    unpacker.unpack(notzipFileName, outDir)
    .should.be.rejectedWith(/was not recognised/).and.notify(done);
  });

  it('should reject if the file doesn\'t exist', function (done) {
    unpacker.unpack('SPLOPPO.zip', outDir)
    .should.be.rejectedWith(/does not exist/).and.notify(done);
  });

  it('should reject if the unpack path exists but is not a file', function (done) {
    unpacker.unpack(outDir, outDir)
    .should.be.rejectedWith(/is not a file/).and.notify(done);
  });

  it('should unpack non-tarball gz files', function (done) {
    this.timeout(30000);
    var expectedTextFile = path.join(outDir, 'TEST.txt');
    var expectedContent = 'expected content is here\n';

    unpacker.unpack(gzippedTextFileName, outDir)
    .then(function () {
      // move the output file to the build/ directory so it gets cleaned
      // up
      shell.mv(path.join(testArchivesDir, 'TEST.txt'), expectedTextFile);

      var actualContent = fs.readFileSync(expectedTextFile, 'utf8');

      if (actualContent !== expectedContent) {
        return Q.reject(new Error('expected content "' + expectedContent +
                                  '" but got "' + actualContent + '"'));
      }
      else {
        return Q.resolve();
      }
    })
    .should.be.fulfilled.and.notify(done);
  });

  it('should unpack zip files', function (done) {
    this.timeout(30000);
    var unpackedDir = path.join(outDir, 'TEST-zip');
    fsHelpers.cleanDir(unpackedDir);

    unpacker.unpack(zipFileName, outDir)
    .then(
      function () {
        return shell.mv(path.join(outDir, 'TEST'), unpackedDir);
      }
    )
    .then(
      function () {
        return fsHelpers.compareDirectories(comparisonDir, unpackedDir)
      }
    )
    .should.be.fulfilled.and.notify(done);
  });

  it('should unpack tgz files', function (done) {
    this.timeout(30000);
    var unpackedDir = path.join(outDir, 'TEST-tgz');
    fsHelpers.cleanDir(unpackedDir);

    unpacker.unpack(tgzFileName, outDir)
    .then(
      function () {
        return shell.mv(path.join(outDir, 'TEST'), unpackedDir);
      }
    )
    .then(
      function () {
        return fsHelpers.compareDirectories(comparisonDir, unpackedDir)
      }
    )
    .should.be.fulfilled.and.notify(done);
  });

  it('should unpack tar files', function (done) {
    this.timeout(30000);
    var unpackedDir = path.join(outDir, 'TEST-tar');
    fsHelpers.cleanDir(unpackedDir);

    unpacker.unpack(tarFileName, outDir)
    .then(
      function () {
        return shell.mv(path.join(outDir, 'TEST'), unpackedDir);
      }
    )
    .then(
      function () {
        return fsHelpers.compareDirectories(comparisonDir, unpackedDir)
      }
    )
    .should.be.fulfilled.and.notify(done);
  });

});
