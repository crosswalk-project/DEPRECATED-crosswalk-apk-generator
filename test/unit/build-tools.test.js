/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var sinon = require('sinon');
var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();

var Q = require('q');

var BuildTools = require('../../src/build-tools');
var fixsep = require('../../src/path-helpers').fixSeparators;

var resolvingFn = function () {
  return Q.resolve();
};

// stub Env
var env = {
  aaptWrapper: {
    generateRJava: resolvingFn,
    packageResources: resolvingFn
  },

  javacWrapper: {
    compile: resolvingFn
  },

  dxWrapper: {
    compile: resolvingFn
  },

  apkGenWrapper: {
    packageUnsigned: resolvingFn
  },

  apkSignWrapper: {
    signPackage: resolvingFn
  }
};

// stub Locations
var locations = {
  androidManifest: 'AndroidManifest.xml',
  resDir: '/dest/res',
  assetsDir: '/dest/assetsDir',
  srcDir: '/dest/src',
  buildJars: [],
  finalApk: '/dest/final.apk'
};

// build tools instance for env
var buildTools = BuildTools(env);

describe('BuildTools', function () {

  it('should reject if aapt fails to generate R.java', function (done) {
    var stub = sinon.stub(env.aaptWrapper, 'generateRJava');
    stub.returns(Q.reject(new Error('aapt bad code: generateRJava')));

    var finish = function (e) {
      stub.restore();
      done(e);
    };

    buildTools.makeApk(locations)
    .should.be.rejectedWith(/aapt bad code: generateRJava/)
    .and.notify(finish);
  });

  it('should reject if javac fails to compile source files', function (done) {
    var stub = sinon.stub(env.javacWrapper, 'compile');
    stub.returns(Q.reject(new Error('javac bad code')));

    var finish = function (e) {
      stub.restore();
      done(e);
    };

    buildTools.makeApk(locations)
    .should.be.rejectedWith(/javac bad code/)
    .and.notify(finish);
  });

  it('should reject if aapt fails to package resources', function (done) {
    var stub = sinon.stub(env.aaptWrapper, 'packageResources');
    stub.returns(Q.reject(new Error('aapt bad code: packageResources')));

    var finish = function (e) {
      stub.restore();
      done(e);
    };

    buildTools.makeApk(locations)
    .should.be.rejectedWith(/aapt bad code: packageResources/)
    .and.notify(finish);
  });

  it('should reject if dx fails to compile .dex file', function (done) {
    var stub = sinon.stub(env.dxWrapper, 'compile');
    stub.returns(Q.reject(new Error('dx bad code')));

    var finish = function (e) {
      stub.restore();
      done(e);
    };

    buildTools.makeApk(locations)
    .should.be.rejectedWith(/dx bad code/)
    .and.notify(finish);
  });

  it('should reject if apk gen wrapper fails to package app', function (done) {
    var stub = sinon.stub(env.apkGenWrapper, 'packageUnsigned');
    stub.returns(Q.reject(new Error('apkgen bad code')));

    var finish = function (e) {
      stub.restore();
      done(e);
    };

    buildTools.makeApk(locations)
    .should.be.rejectedWith(/apkgen bad code/)
    .and.notify(finish);
  });

  it('should reject if apk sign wrapper fails to sign package', function (done) {
    var stub = sinon.stub(env.apkSignWrapper, 'signPackage');
    stub.returns(Q.reject(new Error('apksign bad code')));

    var finish = function (e) {
      stub.restore();
      done(e);
    };

    buildTools.makeApk(locations)
    .should.be.rejectedWith(/apksign bad code/)
    .and.notify(finish);
  });

  it('should resolve to final apk location if all tools succeed', function (done) {
    buildTools.makeApk(locations)
    .should.become(locations.finalApk).and.notify(done);
  });

});
