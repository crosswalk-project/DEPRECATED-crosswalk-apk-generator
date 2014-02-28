/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var chai = require('chai');
chai.should();
var expect = chai.expect;

var os = require('os');
var path = require('path');

var Locations = require('../../src/locations');
var fixsep = require('../../src/path-helpers').fixSeparators;

var app = {
  sanitisedName: 'AppOne',
  pkg: 'org01.test',
  activityClassName: 'AppOneActivity'
};

var tmpdir = (os.tmpdir || os.tmpDir)();

describe('locations', function () {
  it('should set default destination to tmp dir for os', function () {
    var locations = Locations(app.sanitisedName, app.pkg, 'x86');
    locations.destDir.should.eql(path.join(tmpdir, 'xwalk-apk-gen'));
  });

  it('should set destination dir when passed to constructor', function () {
    var locations = Locations(app.sanitisedName, app.pkg, 'x86', '/out');
    locations.destDir.should.eql('/out');
  });

  it('configure() should throw an error for missing parameters', function () {
    // missing name
    var func1 = function () {
      Locations()
    };

    expect(func1).to.throw(Error, /name/);

    // missing pkg
    var func2 = function () {
      Locations('boo');
    };

    expect(func2).to.throw(Error, /pkg/);

    // missing arch
    var func3 = function () {
      Locations('boo', 'bar');
    };

    expect(func3).to.throw(Error, /arch/);
  });

  it('should set destination paths when configured for an app', function () {
    var locations = Locations(app.sanitisedName, app.pkg, 'x86', '/out');

    locations.classesDir.should.eql(fixsep('/out/classes'));
    locations.dexFile.should.eql(fixsep('/out/classes.dex'));

    locations.resPackageApk.should.eql(fixsep('/out/AppOne.x86.ap_'));
    locations.unsignedApk.should.eql(fixsep('/out/AppOne-unsigned.x86.apk'));
    locations.signedApk.should.eql(fixsep('/out/AppOne-signed.x86.apk'));
    locations.finalApk.should.eql(fixsep('/out/AppOne.x86.apk'));

    locations.resDir.should.eql(fixsep('/out/res'));
    locations.assetsDir.should.eql(fixsep('/out/assets'));
    locations.srcDir.should.eql(fixsep('/out/src'));

    locations.javaPackageDir.should.eql(fixsep('/out/src/org01/test'));

    locations.androidManifest.should.eql(fixsep('/out/AndroidManifest.xml'));

    locations.defaultDrawableDir.should.eql(fixsep('/out/res/drawable'));
    locations.drawableDirs.should.eql({
      xhdpi: fixsep('/out/res/drawable-xhdpi'),
      hdpi: fixsep('/out/res/drawable-hdpi'),
      mdpi: fixsep('/out/res/drawable-mdpi'),
      ldpi: fixsep('/out/res/drawable-ldpi')
    });
  });
});
