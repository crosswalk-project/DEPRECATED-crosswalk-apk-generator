/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var Q = require('q');
var _ = require('lodash');
var path = require('path');
var fs = require('fs');
var shell = require('shelljs');
var mkdirp = require('mkdirp');

// ensure that directory path is a directory and ready to be written
// to; throws an error if pathToCreate is present but is a file
var prepareDirectory = function (pathToCreate) {
  var dfd = Q.defer();

  var exists = fs.existsSync(pathToCreate);
  var isFile = exists && fs.statSync(pathToCreate).isFile();

  if (isFile) {
    var msg = 'could not prepare directory ' + pathToCreate +
              ' as it already exists and is a file';
    dfd.reject(new Error(msg));
  }
  else if (exists) {
    dfd.resolve(true);
  }
  else {
    mkdirp(pathToCreate, function (err) {
      if (err) {
        dfd.reject(err);
      }
      else {
        dfd.resolve(true);
      }
    });
  }

  return dfd.promise;
};

// resolve all paths in an object which maps names to paths,
// e.g. { 'manifest': 'foo/bar'}, relative to root
// root: root directory to join to each path
// paths: object which maps a key to a relative path
var resolvePaths = function (root, paths) {
  _.each(paths, function (pathIn, key) {
    paths[key] = path.join(root, pathIn);
  });

  return paths;
};

// uppercase the first letter of str
var titleCase = function (str) {
  return str.slice(0, 1).toUpperCase() + str.slice(1);
};

/**
 * Class to generate a file and directory skeleton; this can be used
 * as the base structure to generate an apk from.
 *
 * Caveats:
 *
 * <ul>
 *   <li>only works for --app-root and --app-local-path (not --app-url,
 *   though that might be simple to add)</li>
 * </ul>
 *
 * @constructor
 *
 * @param {string} [templatesDir=AppSkeleton.DEFAULT_SKELETON_DIR] -
 * directory containing the *.template files and directories used to
 * create the skeleton directory tree; note that this is part of this
 * project, NOT part of the xwalk-android download
 */
var AppSkeleton = function (templatesDir) {
  // enable use of this function as a factory without "new"
  if (!(this instanceof AppSkeleton)) {
    return new AppSkeleton(templatesDir);
  }

  /**
   * @desc location of the application skeleton directory, containing
   * text file templates and assets (e.g. images) to include in the
   * built apk file
   * @member
   * @type object
   * @instance
   */
  this.templatesDir = templatesDir || AppSkeleton.DEFAULT_SKELETON_DIR;

  /**
   * @desc locations of text file templates,
   * relative to {@link AppSkeleton#templatesDir}
   * @member
   * @type object
   * @instance
   */
  this.templates = resolvePaths(this.templatesDir, {
    'AndroidManifest.xml': 'AndroidManifest.xml.template',
    'Activity.java': 'Activity.java.template',
    'extensions-config.json': 'extensions-config.json.template'
  });

  /**
   * @desc locations of assets to be copied into output skeleton,
   * underneath {@link AppSkeleton#templatesDir}
   * @member
   * @type object
   * @instance
   */
  this.assets = {
    'values': path.resolve(this.templatesDir, 'res/values'),

    'icons': resolvePaths(this.templatesDir, {
      'xhdpi': 'res/drawable-xhdpi/crosswalk.png',
      'hdpi': 'res/drawable-hdpi/crosswalk.png',
      'mdpi': 'res/drawable-mdpi/crosswalk.png',
      'ldpi': 'res/drawable-ldpi/crosswalk.png'
    })
  };
};

/**
 * @desc location of the default app skeleton (part of this project);
 * set to <code>&lt;project root&gt;/data/xwalk-app-skeleton</code>
 * @member {string} AppSkeleton.DEFAULT_SKELETON_DIR
 */
AppSkeleton.DEFAULT_SKELETON_DIR = path.join(
  __dirname, '..', 'data', 'xwalk-app-skeleton'
);

/**
 * Create content from a template file, filling any placeholders
 * from the content of this.options.
 * NB this does not write out to the filesystem.
 *
 * @param {string} template - name of the template to run (from
 * {@link AppSkeleton#templates})
 * @param {object} data
 *
 * @returns {string} generated content, with variables from
 * data interpolated
 */
AppSkeleton.prototype.runTemplate = function (template, data) {
  var rawContent = fs.readFileSync(this.templates[template], 'utf8');
  return _.template(rawContent, data);
};

/**
 * Generate an xwalk skeleton for an app, copying any existing assets
 * from {@link AppSkeleton#templatesDir}, generating AndroidManifest.xml
 * and an activity class, and copying the content of res from
 * the skeleton directory into it.
 *
 * Note that this will overwrite any existing files in destDir
 * and will not clean the directory before starting to write to it.
 *
 * @param {object} appData - object containing the data required
 * by the various template files; see {@link Env.build} for an example
 * of how it's constructed
 * @param {Locations} locations - object containing output directory and file
 * paths
 *
 * @returns {external:Promise} resolves to true, or rejects if an
 * error occurs
 */
AppSkeleton.prototype.generate = function (appData, locations) {
  var self = this;
  var dfd = Q.defer();

  // ensure destDirs are ready; note that because I'm using mkdirp,
  // destDir will be implicitly created
  Q.all([
    // make a directory for compiled classes
    prepareDirectory(locations.classesDir),

    // make a directory for resources
    prepareDirectory(locations.resDir),

    // make a directory for assets; all the assets from appRoot are
    // copied here
    prepareDirectory(locations.assetsDir),

    // directory for .java files
    prepareDirectory(locations.srcDir),

    // make the directory for the activity Java file; we map the
    // Java package name to a directory structure
    prepareDirectory(locations.javaPackageDir)
  ])
  .then(
    function () {
      if (appData.extensions) {
        // make the directory for extensions js files
        return prepareDirectory(locations.extensionsJsDir);
      }
      else {
        return Q.resolve();
      }
    }
  )
  .then(
    function () {
      // icons; default to the ones in the template
      var icons = appData.icon || self.assets.icons;
      var defaultIcon = null;

      // if icons is set to a string, we use the same icon for all screen
      // sizes (i.e. we just have a res/drawable directory containing it);
      // if icons is set to an object, we use that to populate the res/drawable-*
      // directories for different screen sizes
      if (typeof icons === 'string') {
        defaultIcon = icons;

        // we don't have icons for different resolutions; setting this
        // to an empty object will prevent resolution-specific directories
        // being created
        icons = null;
      }
      else {
        // use the largest available icon as the default
        defaultIcon = icons.xhdpi ||
                      icons.hdpi ||
                      icons.mdpi ||
                      icons.ldpi;

        // if an icons object is passed, but keys are missing from it,
        // fill any missing keys with the defaultIcon
        _.each(['xhdpi', 'hdpi', 'mdpi', 'ldpi'], function (resolution) {
          icons[resolution] = icons[resolution] || defaultIcon;
        });
      }

      var basename = path.basename(defaultIcon);
      var ext = path.extname(defaultIcon);
      appData.iconName = basename.replace(ext, '');

      // copy other icons to appropriate res/drawable-* locations
      var iconPromises = [];

      if (icons) {
        _.each(locations.drawableDirs, function (drawableDir, key) {
          var iconPath = icons[key];

          var iconDirPromise = prepareDirectory(drawableDir);
          iconPromises.push(iconDirPromise);

          iconDirPromise.then(function () {
            shell.cp(iconPath, drawableDir);
          }, dfd.reject);
        });
      }
      // if the locations.icon property is null, don't make any
      // resolution-specific directories at all
      else {
        var iconDirPromise = prepareDirectory(locations.defaultDrawableDir);
        iconPromises.push(iconDirPromise);

        // copy default icon to res/drawable
        iconDirPromise.then(function () {
          shell.cp(defaultIcon, locations.defaultDrawableDir);
        }, dfd.reject);
      }

      // wait for all directories to be created
      return Q.all(iconPromises);
    }
  )
  .then(
    function () {
      // copy .java files from the app to build/src
      var srcFiles;
      for (var i = 0; i < appData.javaSrcDirs.length; i += 1) {
        srcFiles = path.join(appData.javaSrcDirs[i], '*');
        shell.cp('-r', srcFiles, locations.srcDir);
      }

      // copy extensions js files from the app to the js extensions
      // directory under build/
      for (i = 0; i < appData.extensionsJsFiles.length; i += 1) {
        shell.cp(appData.extensionsJsFiles[i], locations.extensionsJsDir);
      }

      // copy assets from xwalk_app_template and elsewhere to the assets/
      // directory
      for (i = 0; i < locations.assets.length; i += 1) {
        shell.cp('-r', locations.assets[i], locations.assetsDir);
      }

      // copy values/strings.xml
      shell.cp('-r', self.assets.values, locations.resDir);

      // copy content from appRoot to the assets directory
      shell.cp('-r',
        path.join(appData.appRoot, '*'),
        locations.assetsDir
      );

      // Activity java file location
      var activityClassName = titleCase(appData.sanitisedName) +
                              'Activity';

      // we need this in the templates
      appData.activityClassName = activityClassName;

      // path to .java activity file
      var activityJava = path.join(
        locations.javaPackageDir,
        activityClassName + '.java'
      );

      // run templates
      var content = self.runTemplate('AndroidManifest.xml', appData);
      fs.writeFileSync(locations.androidManifest, content);

      content = self.runTemplate('Activity.java', appData);
      fs.writeFileSync(activityJava, content);

      if (appData.extensions) {
        // munge jsapi filenames in appData.extensions so that
        // they point to our <hash>-xwalk-extensions/ directory

        // get the base directory relative to the assets/ directory,
        // but make sure the path is separated using '/' characters
        // (as this JSON file is for use on the Android device)
        var extDir = path.relative(locations.assetsDir, locations.extensionsJsDir);

        _.each(appData.extensions, function (extConfig) {
          extConfig.jsapi = path.join(
            extDir,
            path.basename(extConfig.jsapi)
          ).replace(path.sep, '/');
        });

        // create the extensions-config.json file
        content = self.runTemplate('extensions-config.json', appData);
        fs.writeFileSync(locations.extensionsConfig, content);
      }

      return true;
    }
  )
  .done(dfd.resolve, dfd.reject);

  return dfd.promise;
};

module.exports = AppSkeleton;
