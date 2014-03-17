/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

// this writes out to build/app-skeleton-test-out;
// it also copies files from test-app to the output
var path = require('path');

var sinon = require('sinon');
var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();

var shell = require('shelljs');
var Q = require('q');
var _ = require('lodash');

var fsHelpers = require('./fs.helpers.js');

var Locations = require('../../src/locations');
var AppSkeleton = require('../../src/app-skeleton');

// directory to write skeleton output into
var outDir = path.join(__dirname, 'build', 'app-skeleton.test');

describe('AppSkeleton', function () {
  beforeEach(function () {
    fsHelpers.cleanDir(outDir);
    fsHelpers.mkDir(outDir);
  });

  var app = {
    sanitisedName: 'booogles',
    pkg: 'my.package.is.great'
  };

  // same data as constructed by Env.build()
  var templateData = {
    name: app.sanitisedName,
    sanitisedName: app.sanitisedName,
    pkg: app.pkg,
    icon: path.join(__dirname, 'test-app', 'icon.png'),
    permissions: [
      'ACCESS_NETWORK_STATE',
      'CAMERA'
    ],
    theme: 'Boogles.Theme',
    appRoot: path.join(__dirname, 'test-app'),
    appLocalPath: 'index.html',
    appUrl: null,
    remoteDebugging: true,
    targetSdkVersion: 19,
    javaSrcDirs: [],
    extensionsJsFiles: [],
    version: '1.0.0',
    orientation: null
  };

  // Locations object pointing at the output directory
  var locations = Locations(app, {arch: 'x86'}, outDir);

  var appSkeleton = AppSkeleton();

  it('should generate a full application skeleton with custom icon', function (done) {
    appSkeleton.generate(templateData, locations)
    .done(
      // check the files in the output directory
      function () {
        try {
          var tests = [
            fsHelpers.checkFile(outDir, 'AndroidManifest.xml'),
            fsHelpers.checkFile(outDir, 'src', 'my', 'package', 'is', 'great', 'BoooglesActivity.java'),
            fsHelpers.checkFile(outDir, 'res', 'drawable', 'icon.png'),
            fsHelpers.checkFile(outDir, 'res', 'values', 'strings.xml'),
            fsHelpers.checkFile(outDir, 'assets', 'icon.png'),
            fsHelpers.checkFile(outDir, 'assets', 'app', 'index.html'),
            fsHelpers.checkFile(outDir, 'assets', 'app', 'js', 'main.js')
          ];

          var promise = Q.all(tests);

          promise.should.be.fulfilled.and.notify(done);
        }
        catch (e) {
          // catch general errors not handled very well in the code
          // (hopefully won't get here)
          done(e);
        }
      },

      // catch errors from generate()
      done
    );
  });

  it('should generate a full application skeleton with multiple custom icons', function (done) {
    var cloneTemplateData = _.clone(templateData);

    // where an object is specified for icon, but keys are missing,
    // any missing keys should get the default icon (which is in turn
    // the icon supplied for the highest resolution)
    cloneTemplateData.icon = {hdpi: path.join(__dirname, 'test-app', 'icon.png')};

    appSkeleton.generate(cloneTemplateData, locations)
    .done(
      // check the files in the output directory
      function () {
        try {
          var tests = [
            fsHelpers.checkFile(outDir, 'AndroidManifest.xml'),
            fsHelpers.checkFile(outDir, 'src', 'my', 'package', 'is', 'great', 'BoooglesActivity.java'),
            fsHelpers.checkFile(outDir, 'res', 'values', 'strings.xml'),
            fsHelpers.checkFile(outDir, 'assets', 'icon.png'),
            fsHelpers.checkFile(outDir, 'assets', 'app', 'index.html'),
            fsHelpers.checkFile(outDir, 'assets', 'app', 'js', 'main.js'),

            // test the icons have been copied
            fsHelpers.checkFile(outDir, 'res', 'drawable-xhdpi', 'icon.png'),
            fsHelpers.checkFile(outDir, 'res', 'drawable-hdpi', 'icon.png'),
            fsHelpers.checkFile(outDir, 'res', 'drawable-mdpi', 'icon.png'),
            fsHelpers.checkFile(outDir, 'res', 'drawable-ldpi', 'icon.png')
          ];

          var promise = Q.all(tests);

          promise.should.be.fulfilled.and.notify(done);
        }
        catch (e) {
          // catch general errors not handled very well in the code
          // (hopefully won't get here)
          done(e);
        }
      },

      // catch errors from generate()
      done
    );
  });

  it('should generate a full application skeleton with default icons', function (done) {
    var cloneTemplateData = _.clone(templateData);

    // no icons, so we should get the crosswalk ones
    cloneTemplateData.icon = '';

    appSkeleton.generate(cloneTemplateData, locations)
    .done(
      // check the files in the output directory
      function () {
        try {
          var tests = [
            fsHelpers.checkFile(outDir, 'AndroidManifest.xml'),
            fsHelpers.checkFile(outDir, 'src', 'my', 'package', 'is', 'great', 'BoooglesActivity.java'),
            fsHelpers.checkFile(outDir, 'res', 'values', 'strings.xml'),
            fsHelpers.checkFile(outDir, 'assets', 'icon.png'),
            fsHelpers.checkFile(outDir, 'assets', 'app', 'index.html'),
            fsHelpers.checkFile(outDir, 'assets', 'app', 'js', 'main.js'),

            // test the icons have been copied
            fsHelpers.checkFile(outDir, 'res', 'drawable-xhdpi', 'crosswalk.png'),
            fsHelpers.checkFile(outDir, 'res', 'drawable-hdpi', 'crosswalk.png'),
            fsHelpers.checkFile(outDir, 'res', 'drawable-mdpi', 'crosswalk.png'),
            fsHelpers.checkFile(outDir, 'res', 'drawable-ldpi', 'crosswalk.png')
          ];

          var promise = Q.all(tests);

          // check the correct icons have been copied
          var expected = fsHelpers.createDigest(
            AppSkeleton.DEFAULT_SKELETON_DIR,
            'res', 'drawable-xhdpi', 'crosswalk.png'
          );
          fsHelpers.createDigest(outDir, 'res', 'drawable-xhdpi', 'crosswalk.png')
          .should.equal(expected);

          expected = fsHelpers.createDigest(
            AppSkeleton.DEFAULT_SKELETON_DIR,
            'res', 'drawable-hdpi', 'crosswalk.png'
          );
          fsHelpers.createDigest(outDir, 'res', 'drawable-hdpi', 'crosswalk.png')
          .should.equal(expected);

          expected = fsHelpers.createDigest(
            AppSkeleton.DEFAULT_SKELETON_DIR,
            'res', 'drawable-mdpi', 'crosswalk.png'
          );
          fsHelpers.createDigest(outDir, 'res', 'drawable-mdpi', 'crosswalk.png')
          .should.equal(expected);

          expected = fsHelpers.createDigest(
            AppSkeleton.DEFAULT_SKELETON_DIR,
            'res', 'drawable-ldpi', 'crosswalk.png'
          );
          fsHelpers.createDigest(outDir, 'res', 'drawable-ldpi', 'crosswalk.png')
          .should.equal(expected);

          // ensure all files checks succeeded
          promise.should.be.fulfilled.and.notify(done);
        }
        catch (e) {
          // catch general errors not handled very well in the code
          // (hopefully won't get here)
          done(e);
        }
      },

      // catch errors from generate()
      done
    );
  });

  it('should copy extra files if app is in embedded mode', function () {
    // TODO
  });

  it('should copy extra files if app has extensions', function () {
    // TODO
  });

  it('should not copy files if appUrl is set', function () {
    // TODO
  });

  it('should generate AndroidManifest.xml using template data', function () {
    // TODO
  });

  it('should generate activity .java file using template data', function () {
    // TODO
  });

});
