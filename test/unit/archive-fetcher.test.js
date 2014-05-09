/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var path = require('path');

var sinon = require('sinon');
var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.should();

var Q = require('q');

var ArchiveFetcher = require('../../src/archive-fetcher');

// stub objects
var downloader = {
  download: function () {
    // return a promise which provides 2 progress notifications
    // and resolves to a fake output zip file location
    var dfd = Q.defer();

    // I think because of how Q steps work, we have to put a tiny
    // delay on calls to notify() to ensure they are triggered before
    // the resolve() call
    setTimeout(function () {
      dfd.notify(50);
    }, 0);

    setTimeout(function () {
      dfd.notify(100);
    }, 10);

    setTimeout(function () {
      dfd.resolve('xwalk-android.zip');
    }, 20);

    return dfd.promise;
  }
};

var unpacker = {
  unpack: function () {
    return Q.resolve();
  }
};

var logger = {
  log: function () {},
  replace: function () {}
};

// object under test
var archiveFetcher = ArchiveFetcher({
  downloader: downloader,
  unpacker: unpacker,
  logger: logger
});

describe('ArchiveFetcher', function () {

  it('should reject if download fails', function (done) {
    var stub = sinon.stub(downloader, 'download');
    stub.returns(Q.reject(new Error('network error')));

    var finish = function (e) {
      stub.restore();
      done(e);
    };

    archiveFetcher.fetch('http://foo/bar.zip', 'tmp')
    .should.be.rejectedWith(/network error/).and.notify(finish);
  });

  it('should reject if zip file unpack fails', function (done) {
    var stub = sinon.stub(unpacker, 'unpack');
    stub.returns(Q.reject(new Error('bad zip file')));

    var finish = function (e) {
      stub.restore();
      done(e);
    };

    archiveFetcher.fetch('http://foo/bar.zip', 'tmp')
    .should.be.rejectedWith(/bad zip file/).and.notify(finish);
  });

  it('should report progress and resolve to template dir if all steps succeed', function (done) {
    var replaceSpy = sinon.spy(logger, 'replace');
    var logSpy = sinon.spy(logger, 'log');

    // check that the resulting output path matches tmp/bar/xwalk_app_template,
    // which is out directory (tmp) + zip file basename (bar)
    var expected = new RegExp('tmp.+bar');

    var finish = function (e) {
      replaceSpy.restore();
      logSpy.restore();
      done(e);
    };

    archiveFetcher.fetch('http://foo/bar.zip', 'tmp')
    .done(
      function (result) {
        logSpy.callCount.should.equal(3);

        try {
          replaceSpy.callCount.should.equal(2, 'replaceSpy.callCount');
        }
        catch (e) {
          console.error(e.stack);
          throw e;
        }

        result.should.match(expected);

        finish();
      },

      finish
    );
  });

});
