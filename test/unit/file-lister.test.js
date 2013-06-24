/**
 * Copyright 2013 Intel Corporate Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var chai = require('chai')
chai.should();
var expect = chai.expect;
var sinon = require('sinon');

var path = require('path');
var fs = require('fs');

var fileLister = require('../../lib/file-lister');

var dataDir = path.join(__dirname, 'data');
var olderPath = path.join(dataDir, 'older.txt');
var oldestPath = path.join(dataDir, 'oldest.txt')
var youngestPath = path.join(dataDir, 'youngest.txt')

describe('file lister', function () {
  it('should list files in time order', function () {
    var latest = fileLister.getLatest([
      oldestPath,
      olderPath,
      youngestPath
    ]);

    latest.should.equal(youngestPath);
  });

  it('should return an error if localFiles is invalid', function (done) {
    var spy = sinon.spy();

    var cb = function () {
      spy.apply(null, arguments);
      spy.calledWith(sinon.match.instanceOf(Error)).should.be.true;
      done();
    };

    var list = fileLister.list(null, cb);
  });

  it('should return the original string in an array if localFiles is a single string', function (done) {
    var spy = sinon.spy();

    var cb = function () {
      spy.apply(null, arguments);
      spy.calledWith(null, ['foo.txt']).should.be.true;
      done();
    };

    var list = fileLister.list('foo.txt', cb);
  });

  it('should return an error if pattern is invalid', function (done) {
    var spy = sinon.spy();

    var cb = function () {
      spy.apply(null, arguments);
      spy.calledWith(sinon.match.instanceOf(Error)).should.be.true;
      done();
    };

    var list = fileLister.list({pattern: null}, cb);
  });

  it('should list files matching a glob', function (done) {
    var spy = sinon.spy();

    var expected = [ olderPath, oldestPath ];

    var cb = function () {
      spy.apply(null, arguments);
      spy.lastCall.args[1].should.deep.equal(expected);
      done();
    };

    var glob = path.join(dataDir, 'old*');
    var list = fileLister.list({pattern: glob}, cb);
  });

  it('should return the most-recently-modified file matching a glob', function (done) {
    var spy = sinon.spy();

    var expected = [ olderPath ];

    var cb = function () {
      spy.apply(null, arguments);
      spy.lastCall.args[1].should.deep.equal(expected);

      // manual check that the returned file is correct
      var mtimeOlder = fs.statSync(olderPath).mtime.getTime()
      var mtimeOldest = fs.statSync(oldestPath).mtime.getTime()

      expect(mtimeOlder).to.be.greaterThan(mtimeOldest);

      done();
    };

    var glob = path.join(dataDir, 'old*');
    fileLister.list({pattern: glob, filter: 'latest'}, cb);
  });

  it('should return the original array if a string array is passed in', function (done) {
    var spy = sinon.spy();

    var expected = [ oldestPath, olderPath ];

    var cb = function () {
      spy.apply(null, arguments);
      spy.lastCall.args[1].should.deep.equal(expected);
      done();
    };

    fileLister.list([ oldestPath, olderPath ], cb);
  });
});
