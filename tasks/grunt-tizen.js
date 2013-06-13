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
module.exports = function (grunt) {
  'use strict';

  // TODO temporary while code moves to bridge.js
  var bridge = require('../lib/bridge').init({
    sdbCmd: process.env.SDB,
    logger: grunt.log
  });

  var parser = new (require('xml2js').Parser)();

  var tizenConfig = require('../lib/tizen-config').create({
    parser: parser,

    // TODO this should come from grunt-tizen configuration
    configFile: 'data/config.xml'
  });

  // ACTIONS

  /**
   * push: push a file to the device
   *
   * config.remoteDir: remote directory to push to; the absolute
   * path to the destination file is the basename of the local file
   * appended to this directory
   * config.chmod: chmod command to apply to pushed files, e.g. '+x';
   * this is passed as an argument to chmod directly, e.g.
   * '+x' would run "chmod +x <files>" (optional)
   * config.overwrite: (default=true) if false and the file exists,
   * it isn't pushed again
   * config.localFiles: single filename as a string, an array of
   * filenames, or an object with form {pattern: 'xxx', filter: 'yyy'},
   * where 'xxx' is a file glob and 'yyy' is a filter ('latest' is
   * the only valid value, which will sort the matched files and get
   * the one which was last modified)
   */
  var push = function (config, done) {
    if (!config.localFiles) {
      grunt.fatal('tizen:push needs localFiles property');
    }
    if (!config.remoteDir) {
      grunt.fatal('tizen:push needs remoteDir property');
    }

    // get variables from config and set defaults
    var overwrite = (config.overwrite === false ? false : true);
    var chmod = config.chmod || null;

    bridge.push(config.localFiles, config.remoteDir, overwrite, chmod, done);
  };

  /**
   * install: install a wgt file on the device; NB the file needs
   * to be on the device first
   *
   * config.remoteScript: the tizen-app.sh script location on the device
   * config.remoteFiles: full path to a file, array of full paths to
   * files, or a {pattern: xxx, filter: yyy} object, where xxx is a file
   * glob for the remote filesystem and yyy; can be set to 'latest' to
   * retrieve the last modified file retrieved by the glob; this specifies
   * the remote files to be installed
   * config.sdbCmd: the sdb binary path (default='sdb')
   * done: function with signature done(err), where err is set to
   * a non-null value if an error occurs
   */
  var install = function (config, done) {
    // TODO errors if config is missing
    bridge.install(config.remoteScript, config.remoteFiles, done);
  };

  /**
   * uninstall: uninstall a package by its ID
   *
   * config.remoteScript: the tizen-app.sh script location on the device
   * config.config: local location of config.xml (default='config.xml');
   * this is used as the source for the app ID (the URI in widget[@id])
   * config.sdbCmd: the sdb binary path (default='sdb')
   * done: function with signature done(err), where err is set to
   * a non-null value if an error occurs
   * config.stopOnFailure: if true and uninstall fails, stop grunt
   * (default: false)
   */
  var uninstall = function (config, done) {
    // TODO errors on missing config
    var stopOnFailure = (config.stopOnFailure === true ? true : false);

    tizenConfig.getMeta(function (err, meta) {
      if (err) {
        done(err);
      }
      else {
        bridge.uninstall(config.remoteScript, meta.id, stopOnFailure, done);
      }
    });
  };

  /**
   * script: run an arbitrary script on the device
   *
   * config.remoteScript: full path to remote script
   * NB the remote script is passed the following arguments by default:
   *   $1 == the URI of the widget (widget.id from config.xml)
   *   $2 == the ID of the widget (tizen:application.id from config.xml)
   * config.args: additional arguments to pass
   */
  var script = function (config, done) {
    var args = config.args || [];

    tizenConfig.getMeta(function (err, meta) {
      if (err) {
        done(err);
      }
      else {
        args = [meta.uri, meta.id].concat(args);
        bridge.runScript(config.remoteScript, args, done);
      }
    });
  };

  /**
   * launch: start/stop application
   *
   * config.remoteScript: the tizen-app.sh script location on the device
   * config.config: location of config.xml (default='config.xml')
   * config.localPort: local port which is forwarded to the debug port
   * for this app on the device (default=8888)
   * config.stopOnFailure: true to stop if the launch command fails
   * (default=false)
   * config.browserCmd: command to open the browser at the debug URL;
   * use '%URL%' to pass the URL of the debug page into the browser
   * command line, e.g. 'google-chrome %URL%'
   * subcommand: 'stop', 'start', 'debug'
   * done: function with signature done(err), where err is set to
   * a non-null value if an error occurs
   */
  var launch = function (config, subcommand, done) {
    var remoteScript = config.remoteScript;
    var localPort = config.localPort || '8888';
    var browserCmd = config.browserCmd || null;
    var stopOnFailure = (config.stopOnFailure === true ? true : false);

    var cb = done;

    if (subcommand === 'debug') {
      cb = function (err, result) {
        if (err) {
          done(err);
        }
        else {
          var remotePort = result.match(/PORT (\d+)/)[1];
          bridge.portForward(localPort, remotePort, browserCmd, done);
        }
      };
    }

    tizenConfig.getMeta(function (err, meta) {
      if (err) {
        cb(err);
      }
      else {
        bridge.launch(remoteScript, subcommand, meta.uri, stopOnFailure, cb);
      }
    });
  };

  /**
   * grunt tizen:* task
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
   * The actions available are:
   *
   *   push
   *   install
   *   uninstall
   *   script
   *   start (see launch())
   *   stop (see launch())
   *   debug (see launch())
   *
   * To be able to use these actions, you should first set up a
   * push action to send the tizen-app.sh script to the device.
   * Configure in grunt.initConfig() like this (the example creates
   * a grunt tizen:prepare task which pushes the tizen-app.sh control
   * script to the device):
   *
   *   grunt.initConfig({
   *     // ... other config ...
   *
   *     tizen: {
   *       prepare: {
   *         action: 'push',
   *         localFiles: './tools/grunt-tasks/tizen-app.sh',
   *         remoteDestDir: '/home/developer/',
   *         chmod: '+x',
   *         overwrite: true,
   *         asRoot: true
   *       },
   *
   *       // ... more tizen task config here ...
   *     }
   *   });
   *
   * Then call with grunt like this:
   *
   *   grunt tizen:prepare
   *
   * Once the tizen-app.sh script is in place, you can configure the
   * other tasks to make use of it, e.g.
   *
   * tizen: {
   *   prepare: { ... see above ... },
   *
   *   pushwgt: {
   *     action: 'push',
   *     localFiles: {
   *       pattern: 'build/*.wgt',
   *       filter: 'latest'
   *     },
   *     remoteDestDir: '/home/developer/'
   *   },
   *
   *   install: {
   *     action: 'install',
   *     remoteFiles: {
   *       pattern: '/home/developer/*.wgt',
   *       filter: 'latest'
   *     },
   *     remoteScript: '/home/developer/tizen-app.sh'
   *   }
   * }
   *
   * See the documentation for push(), install(), uninstall()
   * and launch() for the valid configuration options for each task.
   *
   * Note that the wrt-launcher commands use the <widget> element's
   * id attribute to determine the ID of the app; by default this is
   * derived from a config.xml file in the root of the project. If the
   * config.xml file is somewhere else, use the "config" key to
   * set the location for a task, e.g. config: 'platforms/tizen/config.xml'.
   *
   * For tasks where asRoot=true, you will need a recent sdb
   * (Tizen 2.1-compatible). If you want to specify the version of
   * sdb to use, set an SDB environment variable to your sdb path;
   * alternatively, set the sdbCmd property on a task to your sdb path.
   */
  grunt.registerMultiTask('tizen', 'manage Tizen applications', function () {
    this.data.sdbCmd = this.data.sdbCmd || process.env.SDB || 'sdb';
    this.data.config = this.data.config || 'config.xml';
    var asRoot = this.data.asRoot || false;
    var action = this.data.action;

    if (!action) {
      grunt.fatal('tizen task requires action argument');
    }

    var done = this.async();

    // arguments we'll pass to the cmd function denoted by action
    var args = [this.data];

    // determine which command to execute
    var cmd = null;

    if (action === 'push') {
      cmd = push;
    }
    else if (action === 'install') {
      cmd = install;
    }
    else if (action === 'uninstall') {
      cmd = uninstall;
    }
    else if (action === 'script') {
      cmd = script;
    }
    // stop, start, debug; we need an extra action argument for this
    else {
      cmd = launch;
      args.push(action);
    }

    // if we're doing this as root, do "sdb root on" first, then
    // execute the command, then "sdb root off"
    if (asRoot) {
      var cb = function () {
        bridge.rootOff(function (err) {
          done(err);
        });
      };

      args.push(cb);

      bridge.rootOn(function (err) {
        if (err) {
          done(err);
        }
        else {
          cmd.apply(null, args);
        }
      });
    }
    else {
      // the done() callback is the last argument
      args.push(done);

      // invoke our command with args
      cmd.apply(null, args);
    }
  });
};
