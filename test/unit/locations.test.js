/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var chai = require('chai');
chai.should();
var expect = chai.expect;

var os = require('os');
var path = require('path');

var Locations = require('../../src/locations');
var pr = path.resolve;

var app = {
  sanitisedName: 'AppOne',
  pkg: 'org01.test',
  activityClassName: 'AppOneActivity'
};

var env = {
  arch: 'x86'
};

var tmpdir = (os.tmpdir || os.tmpDir)();

describe('locations', function () {
  it('should set default destination to tmp dir for os', function () {
    var locations = Locations(app, env);
    locations.destDir.should.eql(path.join(tmpdir, 'xwalk-apk-gen'));
  });

  it('should set destination dir when passed to constructor', function () {
    var locations = Locations(app, env, '/out');
    locations.destDir.should.eql(pr('/out'));
  });

  it('configure() should throw an error for missing parameters', function () {
    // missing name
    var func1 = function () {
      Locations()
    };

    expect(func1).to.throw(Error, /sanitisedName/);

    // missing pkg
    var func2 = function () {
      Locations({sanitisedName: 'boo'});
    };

    expect(func2).to.throw(Error, /pkg/);
  });

  it('should set destination paths when configured for an app', function () {
    var locations = Locations(app, env, '/out');

    locations.classesDir.should.eql(pr('/out/classes'));
    locations.dexFile.should.eql(pr('/out/classes.dex'));

    locations.resPackageApk.should.eql(pr('/out/AppOne.x86.ap_'));
    locations.unsignedApk.should.eql(pr('/out/AppOne-unsigned.x86.apk'));
    locations.signedApk.should.eql(pr('/out/AppOne-signed.x86.apk'));
    locations.finalApk.should.eql(pr('/out/AppOne.x86.apk'));

    locations.resDir.should.eql(pr('/out/res'));
    locations.assetsDir.should.eql(pr('/out/assets'));
    locations.srcDir.should.eql(pr('/out/src'));

    locations.javaPackageDir.should.eql(pr('/out/src/org01/test'));

    locations.androidManifest.should.eql(pr('/out/AndroidManifest.xml'));

    locations.defaultDrawableDir.should.eql(pr('/out/res/drawable'));
    locations.drawableDirs.should.eql({
      xhdpi: pr('/out/res/drawable-xhdpi'),
      hdpi: pr('/out/res/drawable-hdpi'),
      mdpi: pr('/out/res/drawable-mdpi'),
      ldpi: pr('/out/res/drawable-ldpi')
    });
  });
});
