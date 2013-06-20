/**
 * Environment-agnostic versions of the grunt tasks.
 * Responsible for constructing the various component
 * objects, configuring them, and returning the tasks grunt needs.
 */
var path = require('path');
var TIZEN_APP_SCRIPT = path.join(__dirname, '../scripts/tizen-app.sh');

// OBJECTS
var fileLister = require('./file-lister');
var browserWrapper = require('./browser-wrapper');

var sdbWrapper = require('./sdb-wrapper').create({
  // set at runtime from config; sdb command to use
  sdbCmd: null
});

var bridge = require('./bridge').create({
  sdbWrapper: sdbWrapper,
  fileLister: fileLister,
  browserWrapper: browserWrapper,

  // set at runtime from config; logger object
  logger: null,

  // set at runtime from config; the directory the tizen-app.sh script
  // should be pushed to on the device
  tizenAppScriptDir: null,

  // internally set at runtime from tizenAppScriptDir and TIZEN_APP_SCRIPT;
  // location of the tizen-app.sh script on the device
  tizenAppScriptPath: null
});

var parser = new (require('xml2js').Parser)();

var tizenConfig = require('./tizen-config').create({
  parser: parser,

  // set at runtime from config; location of config.xml
  configFile: null
});

// PUBLIC API

/**
 * Configure tasks, returning an object with the two grunt
 * tasks.
 */
var configure = function (config) {
  'use strict';

  // configure objects using runtime grunt config;
  // these are the points where tizen tasks touch the device
  // and the local filesystem
  bridge.tizenAppScriptDir = config.tizenAppScriptDir || 'tmp';

  bridge.logger = config.logger;

  sdbWrapper.sdbCmd = config.sdbCmd || process.env.SDB || 'sdb';

  tizenConfig.configFile = config.configFile || 'config.xml';

  // set location of the tizen-app.sh script, based on the local
  // filename for the script and the configured directory
  bridge.tizenAppScriptPath = bridge.getDestination(
    TIZEN_APP_SCRIPT,
    bridge.tizenAppScriptDir
  );

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
      done(new Error('tizen "push" action needs a localFiles property'));
    }
    if (!config.remoteDir) {
      done(new Error('tizen "push" action needs a remoteDir property'));
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
    if (!config.remoteFiles) {
      done(new Error('tizen "install" action needs a remoteFiles property'));
    }

    bridge.install(config.remoteFiles, done);
  };

  /**
   * uninstall: uninstall a package by its ID
   *
   * config.stopOnFailure: if true and uninstall fails, callback
   * with error (default: false)
   * done: function with signature done(err), where err is set to
   * a non-null value if an error occurs
   */
  var uninstall = function (config, done) {
    var stopOnFailure = (config.stopOnFailure === true ? true : false);

    tizenConfig.getMeta(function (err, meta) {
      if (err) {
        done(err);
      }
      else {
        bridge.uninstall(meta.id, stopOnFailure, done);
      }
    });
  };

  /**
   * script: run an arbitrary script on the device
   *
   * config.remoteScript: remote script to run
   * NB the remote script is passed the following arguments by default:
   *   $1 == the URI of the widget (widget.id from config.xml)
   *   $2 == the ID of the widget (tizen:application.id from config.xml)
   * config.args: additional arguments to pass
   */
  var script = function (config, done) {
    if (!config.remoteScript) {
      done(new Error('tizen "script" action needs a remoteScript property'));
    }

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
          result = result.match(/PORT (\d+)/);

          if (!result) {
            done(new Error('no remote port available for debugging'));
          }
          else {
            var remotePort = result[1];

            bridge.portForward(localPort, remotePort, function (err) {
              if (err) {
                done(err);
              }
              else if (browserCmd) {
                bridge.runBrowser(browserCmd, localPort, done);
              }
              else {
                done();
              }
            });
          }
        }
      };
    }

    tizenConfig.getMeta(function (err, meta) {
      if (err) {
        cb(err);
      }
      else {
        bridge.launch(subcommand, meta.uri, stopOnFailure, cb);
      }
    });
  };

  // TASK DEFINITIONS
  // note that these are not grunt-specific, so they can be unit-tested
  var tizenPrepareTask = function (done) {
    var remoteDir = bridge.tizenAppScriptDir;

    push({
      localFiles: TIZEN_APP_SCRIPT,
      remoteDir: remoteDir,
      chmod: '+x',
      overwrite: true
    }, done);
  };

  var tizenTask = function (data, done) {
    // parameters for this particular invocation
    var asRoot = data.asRoot || false;
    var action = data.action;

    if (!action) {
      done(new Error('tizen task requires action argument'));
    }

    // arguments we'll pass to the function denoted by action
    var args = [data];

    // determine which command function to execute
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
    else if (action === 'start' || action === 'stop' || action === 'debug') {
      cmd = launch;
      args.push(action);
    }

    // die if the action specified doesn't map to any of the known commands
    if (!cmd) {
      done(new Error('action "' + action + '" was not recognised as valid'));
    }

    // if we're doing this as root, do "sdb root on" first, then
    // execute the command, then "sdb root off"
    if (asRoot) {
      // this is the callback which will be applied after
      // root on and the "real" command, to turn off root
      var cb = function () {
        bridge.root(false, function (err) {
          done(err);
        });
      };

      // push the "root off" callback onto the args passed to the
      // "real" command
      args.push(cb);

      // turn root on, and if successful, apply the "real" command;
      // that will in turn invoke the callback which turns root off
      // again
      bridge.root(true, function (err) {
        if (err) {
          done(err);
        }
        else {
          cmd.apply(null, args);
        }
      });
    }
    // do as normal user, not root
    else {
      // the done() callback is the last argument
      args.push(done);

      // invoke our command with args
      cmd.apply(null, args);
    }
  };

  return {
    tizenPrepareTask: tizenPrepareTask,
    tizenTask: tizenTask
  };
};

module.exports = configure;
