/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var sinon = require('sinon');
var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();

var Q = require('q');

var AaptWrapper = require('../../src/wrappers/aapt-wrapper');

var stubCommandRunner = {
  run: function () {
    return Q.resolve();
  }
};

describe('AaptWrapper', function () {
  var aaptWrapper = AaptWrapper('/my/aapt', stubCommandRunner);

  it('should run a command for generating an R.java file', function (done) {
    // the command which we expect
    var expected = '/my/aapt package -m -M AndroidManifest.xml ' +
                   '-A /dest/assets/ -f --auto-add-overlay -S /dest/res ' +
                   '-I myjars/one.jar -I myjars/two.jar -J /dest/src/';

    var spy = sinon.spy(stubCommandRunner, 'run');

    var options = {
      androidManifest: 'AndroidManifest.xml',
      resDirs: ['/dest/res/'],
      assetsDir: '/dest/assets/',
      buildJars: ['myjars/one.jar', 'myjars/two.jar'],
      srcDir: '/dest/src/'
    };

    aaptWrapper.generateRJava(options)
    .done(
      function () {
        spy.should.have.been.calledWith(expected);
        spy.restore();
        done();
      },

      done
    );
  });

  it('should run a command for packaging resources', function (done) {
    // the command which we expect
    var expected = '/my/aapt package -m -M AndroidManifest.xml ' +
                   '-A /dest/assets/ -f --auto-add-overlay -S /dest/res ' +
                   '-I myjars/one.jar -I myjars/two.jar -F /dest/mypackage.apk';

    var spy = sinon.spy(stubCommandRunner, 'run');

    var options = {
      androidManifest: 'AndroidManifest.xml',
      resDirs: ['/dest/res/'],
      assetsDir: '/dest/assets/',
      buildJars: ['myjars/one.jar', 'myjars/two.jar'],
      resPackageApk: '/dest/mypackage.apk'
    };

    aaptWrapper.packageResources(options)
    .done(
      function () {
        spy.should.have.been.calledWith(expected);
        spy.restore();
        done();
      },

      done
    );
  });

});
