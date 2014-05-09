/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var sinon = require('sinon');
var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();

var VersionsFetcher = require('../../src/versions-fetcher');

var stubFetchFn = function () {
};

describe('VersionsFetcher', function () {

  describe('getDownloads()', function () {

    var fetcher = VersionsFetcher({urlFetchFn: stubFetchFn});

    it('should fail if channel is not specified', function (done) {
      fetcher.getDownloads()
      .done(
        function () {
          done(new Error('succeeded but should have failed'));
        },

        function (e) {
          if (/channel/.test(e.message)) {
            done();
          }
          else {
            done(e);
          }
        }
      );
    });

    it('should fail if channel is not specified', function (done) {
      fetcher.getDownloads('x86')
      .should.be.rejectedWith(/channel/)
      .and.should.not.be.rejectedWith(/arch/)
      .and.notify(done);
    });

    it('should fail for invalid channel', function (done) {
      fetcher.getDownloads('x86', 'asfjjkg')
      .should.be.rejectedWith(/channel/)
      .and.should.not.be.rejectedWith(/arch/)
      .and.notify(done);
    });

    it('should return a list of downloads for arch/channel', function () {
      // TODO
    });

  });

});
