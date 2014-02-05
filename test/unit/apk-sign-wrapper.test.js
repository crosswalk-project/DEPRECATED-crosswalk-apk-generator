/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var sinon = require('sinon');
var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();

var Q = require('q');

var ApkSignWrapper = require('../../src/wrappers/apk-sign-wrapper');

var stubCommandRunner = {
  run: function (cmd) {
    return Q.resolve();
  }
};

var stubShell = {
  rm: function () {},
  cp: function () {},
  test: function () { return true; }
};

describe('ApkSignWrapper', function () {
  var apkSignWrapper = ApkSignWrapper(
    '/my/jarsigner',
    '/my/zipalign',
    '/my/keystore',
    'foopassword',
    'mykeyalias',
    stubCommandRunner,
    stubShell
  );

  it('should run the jarsigner and zipalign commands', function (done) {
    var spy = sinon.spy(stubCommandRunner, 'run');
    var rmSpy = sinon.spy(stubShell, 'rm');
    var cpSpy = sinon.spy(stubShell, 'cp');

    var options = {
      unsignedApk: '/dest/unsigned.apk',
      signedApk: '/dest/signed.apk',
      finalApk: '/dest/final.apk'
    };

    var jarsignerCmd = '/my/jarsigner -sigalg SHA1withRSA -digestalg SHA1 ' +
                       '-keystore /my/keystore -storepass foopassword ' +
                       '/dest/signed.apk mykeyalias';

    var zipalignCmd = '/my/zipalign -f 4 /dest/signed.apk /dest/final.apk';

    apkSignWrapper.signPackage(options)
    .done(
      function () {
        spy.should.have.been.calledWith(jarsignerCmd);
        spy.should.have.been.calledWith(zipalignCmd);
        rmSpy.should.have.been.calledWith('/dest/signed.apk');
        cpSpy.should.have.been.calledWith('/dest/unsigned.apk', '/dest/signed.apk');

        spy.restore();
        rmSpy.restore();
        cpSpy.restore();

        done();
      },

      done
    );
  });

});
