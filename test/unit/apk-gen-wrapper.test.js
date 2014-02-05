/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var sinon = require('sinon');
var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();

var Q = require('q');

var ApkGenWrapper = require('../../src/wrappers/apk-gen-wrapper');

var stubCommandRunner = {
  run: function (cmd) {
    return Q.resolve();
  }
};

describe('ApkGenWrapper', function () {
  var apkGenWrapper = ApkGenWrapper(
    '/my/ant',
    '/my/androidSDK',
    '/my/androidSDK/libs/anttasks.jar',
    '/my/xwalk-android/package.xml',
    stubCommandRunner
  );

  it('should call Ant with the xwalk package buildfile', function (done) {
    // note that because packageUnsigned() only uses path.relative(),
    // none of the paths are translated to os-specific ones when
    // constructing the command to run
    var expected = '/my/ant -Dbasedir=/my/dest ' +
                   '-DANDROID_SDK_ROOT=/my/androidSDK ' +
                   '-DANT_TASKS_JAR=/my/androidSDK/libs/anttasks.jar ' +
                   '-DAPK_NAME=resources -DCONFIGURATION_NAME=Release ' +
                   '-DOUT_DIR=/my/dest -DSOURCE_DIR=src ' +
                   '-DUNSIGNED_APK_PATH=/my/dest/myapp-unsigned.apk ' +
                   '-buildfile /my/xwalk-android/package.xml';

    var spy = sinon.spy(stubCommandRunner, 'run');

    var options = {
      destDir: '/my/dest',
      resPackageApk: '/my/dest/resources.ap_',
      srcDir: '/my/dest/src',
      unsignedApk: '/my/dest/myapp-unsigned.apk'
    };

    apkGenWrapper.packageUnsigned(options)
    .done(
      function () {
        spy.should.have.been.calledWith(expected, sinon.match.string);
        spy.restore();
        done();
      },

      done
    );
  });

});
