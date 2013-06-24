/*
 * Copyright (c) 2013, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */

/**
 * grunt-tizen: Tizen-related tasks for grunt
 */
var bridgeMaker = require('../lib/bridge-maker');
var tizenConfigMaker = require('../lib/tizen-config-maker');
var tasksMaker = require('../lib/tasks-maker');

module.exports = function (grunt) {
  'use strict';

  var makeTasks = function (config) {
    var bridge = bridgeMaker(config);
    var tizenConfig = tizenConfigMaker(config);
    return tasksMaker({bridge: bridge, tizenConfig: tizenConfig});
  };

  /**
   * tizen_prepare
   * Task to push the tizen-app.sh script up to the device.
   */
  grunt.registerTask(
    'tizen_prepare',
    'Prepare for Tizen grunt tasks',
    function () {
      var config = grunt.config.get('tizen_configuration');
      config.logger = grunt.log;

      var done = this.async();

      try {
        makeTasks(config).tizenPrepareTask.call(this, done);
      }
      catch (e) {
        grunt.fatal(e);
      }
    }
  );

  /**
   * tizen
   * Task to wrap sdb and related commands on the device.
   *
   * Wrappers for sdb commands for the whole development lifecycle,
   * including pushing wgt files to a device and
   * wrapping the wrt-installer and wrt-launcher commands;
   * also makes it easy to set up remote debugging for an app.
   *
   * Caveats: it will probably fail miserably if you try to have
   * multiple Tizen devices attached at the same time.
   *
   * DEPENDENCIES: grunt, lodash, xml2js, async
   * (install with npm)
   *
   * There are two tasks available:
   *
   *   tizen_prepare - push the tizen-app.sh script to the device;
   *     this is a pre-requisite for running install, uninstall, start,
   *     stop or debug (see below)
   *
   *   tizen - this has several configurable actions:
   *     push
   *     install
   *     uninstall
   *     script
   *     start
   *     stop
   *     debug
   *
   * To be able to use these actions, you should configure and run
   * grunt tizen:prepare to push the tizen-app.sh script to the device:
   *
   *   tizen_configuration: {
   *     tizenAppScriptDir: '/home/developer/', // where to put tizen-app.sh
   *     configFile: 'data/config.xml', // path to config.xml
   *     sdbCmd: process.env.SDB // sdb command to use
   *   }
   *
   * then:
   *
   *   grunt tizen:prepare
   *
   * Once the tizen-app.sh script is in place, you can configure the
   * other tasks to make use of it, e.g.
   *
   * tizen: {
   *   pushwgt: {
   *     action: 'push',
   *     localFiles: {
   *       pattern: 'build/*.wgt',
   *       filter: 'latest'
   *     },
   *     remoteDir: '/home/developer/'
   *   },
   *
   *   install: {
   *     action: 'install',
   *     remoteFiles: {
   *       pattern: '/home/developer/*.wgt',
   *       filter: 'latest'
   *     }
   *   }
   * }
   *
   * See the documentation for push(), install(), uninstall(),
   * script() and launch() (which is used for start/stop/debug)
   * for the valid configuration options for each task.
   *
   * Note that the wrt-launcher commands use the <widget> element's
   * id attribute to determine the ID of the app; by default this is
   * derived from a config.xml file in the root of the project.
   *
   * For tasks where asRoot=true, you will need a recent sdb
   * (Tizen 2.1-compatible). Specify the version of sdb to use
   * with the sdbCmd key in tizen_configuration.
   */
  grunt.registerMultiTask(
    'tizen',
    'manage Tizen applications',
    function () {
      var config = grunt.config.get('tizen_configuration');
      config.logger = grunt.log;

      var data = this.data;
      var done = this.async();

      try {
        makeTasks(config).tizenTask.call(this, data, done);
      }
      catch (e) {
        grunt.fatal(e);
      }
    }
  );
};
