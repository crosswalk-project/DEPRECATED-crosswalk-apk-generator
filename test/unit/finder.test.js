/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

// these tests look for files in the test/unit/test-dirs directory,
// so these are semi-functional tests as they touch the filesystem
var path = require('path');

var sinon = require('sinon');
var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();
var expect = chai.expect;

var Q = require('q');

var root = path.join(__dirname, 'test-dirs');
var testDirPath = path.join(root, 'foo', path.sep);
var testTxtPath = path.join(root, 'bar', 'test.txt');
var cmd1BatPath = path.join(root, 'foo', 'cmd1.bat');

var Finder = require('../../src/finder');
var finder = Finder();

describe('Finder', function () {

  describe('findFile()', function () {

    it('should use the best guess location first', function (done) {
      var promise = finder.findFile(root, ['bar'], ['test.txt']);
      promise.should.become(testTxtPath).and.notify(done);
    });

    it('should resort to a glob search when best guess fails', function (done) {
      // the file isn't in the foo directory, but in bar
      var promise = finder.findFile(root, ['foo'], ['test.txt']);
      promise.should.become(testTxtPath).and.notify(done);
    });

    it('should reject if the result is ambiguous (> 1 file)', function (done) {
      // there are two flump.txt files under foo/: foo/baz/flump.txt
      // and foo/bam/flump.txt
      var promise = finder.findFile(root, ['foo'], ['flump.txt']);
      promise.should.be.rejectedWith(/ambiguous/).and.notify(done);
    });

  });

  describe('findDirectory()', function () {

    it('should resolve if a matching directory is found', function (done) {
      finder.findDirectory(root, 'foo')
      .should.become(testDirPath).and.notify(done);
    });

    it('should reject if no result is found', function (done) {
      finder.findDirectory(root, 'snat')
      .should.be.rejected.and.notify(done);
    });

    it('should reject if the result is ambiguous (> 1 directory)', function (done) {
      // there are two bar directories: bar/ and baz/bar/;
      // so this rejects as the result is ambiguous
      finder.findDirectory(root, 'bar')
      .should.be.rejectedWith(/ambiguous/).and.notify(done);
    });

  });

  describe('locatePieces()', function () {

    it('should try each of the possible filenames', function (done) {
      var pieces = {
        test: {
          files: ['flam.yml', 'blam.pop', 'test.txt'],

          // the file isn't in the foo directory, but in bar
          guessDirs: ['bar']
        }
      };

      var promise = finder.locatePieces(root, pieces);
      promise.should.become({test: testTxtPath}).and.notify(done);
    });

    it('should look for platform-specific binaries on Windows by guessing the directory', function (done) {
      var windowsFinder = Finder({platform: 'win32'});

      // we want cmd1.bat which is under the foo directory
      // best guess should find this
      var pieces = {
        test: {
          exe: 'cmd1',
          guessDirs: ['foo']
        }
      };

      // we don't want globFiles() to be called for test when
      // we're looking for cmd1.bat: it should just be found under foo
      var spy = sinon.spy(windowsFinder, 'globFiles');

      var promise = windowsFinder.locatePieces(root, pieces);

      var checkAndDone = function (e) {
        spy.calledWith(root, sinon.match(/^cmd1\.bat/)).should.be.false;
        windowsFinder.globFiles.restore();
        done(e);
      };

      promise.should.become({test: cmd1BatPath}).and.notify(checkAndDone);
    });

    it('should reject if any pieces are not found', function (done) {
      // stub the findFile() method on the finder, so we can return
      // a fail
      var reject = Q.reject(new Error('could not find file'));
      var stub = sinon.stub(finder, 'findFile').returns(reject);

      var pieces = {
        test: {
          exe: 'cmd1',
          guessDirs: ['foo']
        }
      };

      var finish = function (e) {
        stub.restore();
        done(e);
      };

      var promise = finder.locatePieces(root, pieces)
      promise.should.be.rejectedWith(/could not find all required locations/)
             .and.notify(finish);
    });

  });

  describe('checkExecutable()', function () {
    var stubCommandRunner = {
      run: function () {}
    };

    var finderWithStub = Finder({commandRunner: stubCommandRunner});

    // note that the error usually includes the return code, but
    // it's difficult to test the properties of an Error instance
    // with chai, beyond its message
    it('should reject if return code is not 0 and !ignoreErrors', function (done) {
      var run = sinon.stub(stubCommandRunner, 'run');

      var err = new Error('bad code');

      run.returns(Q.reject(err));

      var finish = function (e) {
        run.restore();
        done(e);
      };

      var promise = finderWithStub.checkExecutable('bad.exe');
      promise.should.be.rejectedWith(/bad code/)
             .and.notify(finish);
    });

    it('should resolve if return code is not 0 but ignoreErrors is on', function (done) {
      var run = sinon.stub(stubCommandRunner, 'run');

      var err = new Error('bad code');

      run.returns(Q.reject(err));

      var finish = function (e) {
        run.restore();
        done(e);
      };

      var promise = finderWithStub.checkExecutable('bad.exe', [], null, true);
      promise.should.become('bad code')
             .and.notify(finish);
    });

    it('should resolve if return code is not 0 but ignoreErrors is on and regex matches', function (done) {
      var run = sinon.stub(stubCommandRunner, 'run');

      var err = new Error('bad code');

      run.returns(Q.reject(err));

      var finish = function (e) {
        run.restore();
        done(e);
      };

      var promise = finderWithStub.checkExecutable('bad.exe', [], 'bad code', true);
      promise.should.become('bad code')
             .and.notify(finish);
    });

    it('should reject if output does not match required regex', function (done) {
      var run = sinon.stub(stubCommandRunner, 'run');
      run.returns(Q.resolve('I am NOT good'));

      var finish = function (e) {
        run.restore();
        done(e);
      };

      var pattern = 'I am all good';
      var promise = finderWithStub.checkExecutable('bad.exe', [], pattern);
      promise.should.be.rejectedWith(/did not match required regex/)
             .and.notify(finish);
    });

    it('should resolve if output matches required regex', function (done) {
      var output = 'I am all good';
      var run = sinon.stub(stubCommandRunner, 'run');
      run.returns(Q.resolve(output));

      var finish = function (e) {
        run.restore();
        done(e);
      };

      var pattern = 'I am all good';
      var promise = finderWithStub.checkExecutable('bad.exe', [], pattern);
      promise.should.become(output)
             .and.should.not.be.rejectedWith(/did not match required regex/)
             .and.should.not.be.rejectedWith(/bad code/)
             .and.notify(finish);
    });

  });

  describe('checkIsFile()', function () {

    it('should reject if path is not supplied', function (done) {
      var regex = /could not check path as it was not set/;
      finder.checkIsFile().should.be.rejectedWith(regex)
                          .and.notify(done);
    });

    it('should resolve to false if path does not exist', function (done) {
      var nonExistentPath = path.join(root, 'foo', 'blaahaahh');
      finder.checkIsFile(nonExistentPath).should.become(false)
                                         .and.notify(done);
    });

    it('should resolve to false if path is not a file', function (done) {
      var directoryPath = path.join(root, 'foo');
      finder.checkIsFile(directoryPath).should.become(false)
                                       .and.notify(done);
    });

    it('should resolve to true if path exists and is a file', function (done) {
      var existingFilePath = path.join(root, 'bar', 'test.txt');
      finder.checkIsFile(existingFilePath).should.become(true)
                                          .and.notify(done);
    });

  });

  describe('checkIsDirectory()', function () {

    it('should reject if path is not supplied', function (done) {
      var regex = /could not check path as it was not set/;
      finder.checkIsDirectory().should.be.rejectedWith(regex)
                               .and.notify(done);
    });

    it('should resolve to false if path does not exist', function (done) {
      var nonExistentPath = path.join(root, 'blaahaahh');
      finder.checkIsDirectory(nonExistentPath).should.become(false)
                                              .and.notify(done);
    });

    it('should resolve to false if path is not a directory', function (done) {
      var directoryPath = path.join(root, 'bar', 'test.txt');
      finder.checkIsDirectory(directoryPath).should.become(false)
                                       .and.notify(done);
    });

    it('should resolve to true if path exists and is a directory', function (done) {
      var existingFilePath = path.join(root, 'bar');
      finder.checkIsDirectory(existingFilePath).should.become(true)
                                               .and.notify(done);
    });

  });

});
