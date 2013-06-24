/**
 * Copyright 2013 Intel Corporate Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var construct = function () {
  'use strict';

  var _ = require('lodash');
  var async = require('async');
  var path = require('path');

  /**
   * Constructor for Bridge instances.
   *
   * This encapsulates sdb and other commands which make the bridge
   * between the host and the Tizen target bridge.
   *
   * {Object} config Configuration for the instance
   * {SdbWrapper} config.sdbWrapper
   * {Object} [config.logger] Object with write(), error(), warn() and
   * ok() methods
   * {FileLister] config.fileLister
   * {String} [config.tizenAppScriptPath] Path to tizen-app.sh on the device;
   * required to run stop/start/debug/install/uninstall on the device
   * {BrowserWrapper} config.browserWrapper
   */
  var Bridge = function (config) {
    config = config || {};

    if (!config.logger) {
      config.logger = {
        ok: console.log,
        warn: console.log,
        write: console.log,
        error: console.error
      };
    }

    if (!config.sdbWrapper) {
      throw new Error('Bridge must be initialised with an sdbWrapper ' +
                      'instance');
    }

    if (!config.fileLister) {
      throw new Error('Bridge must be initialised with the fileLister instance');
    }

    // config.browserWrapper is optional

    _.extend(this, config);
  };

  /**
   * Test whether a file exists on the device.
   *
   * {String} remoteFilePath Path to test
   * {Function} cb Invoked with cb(null, true) if file exists,
   * cb(null, false) if it doesn't exist, or cb(error) if an error
   * occurred.
   */
  Bridge.prototype.fileExists = function (remotePath, cb) {
    var logger = this.logger;
    var cmd = 'stat ' + remotePath;

    this.sdbWrapper.shell(cmd, function (err, stdout, stderr) {
      if (err) {
        logger.error(stderr);
        cb(err);
      }
      else {
        var fileExists = !(/No such file or directory/.test(stdout));
        cb(null, fileExists);
      }
    });
  };

  /**
   * Apply chmod to a remote path.
   *
   * {String} remotePath Path to apply chmod to.
   * {String} chmod chmod string to apply, e.g. 'a+x', '0777'.
   * {Function} cb Callback to invoke with cb(error) if an error
   * occurs, or just cb() if chmod applied successfully.
   */
  Bridge.prototype.chmod = function (remotePath, chmod, cb) {
    var logger = this.logger;

    var cmd = 'chmod ' + chmod + ' ' + remotePath;

    this.sdbWrapper.shell(cmd, function (err, stdout, stderr) {
      if (err) {
        logger.error(stderr);
        logger.error('could not chmod ' + remotePath);
        cb(err);
      }
      else {
        logger.write(stdout);
        logger.ok('did chmod ' + chmod + ' on ' + remotePath);
        cb();
      }
    });
  };

  /**
   * Get list of remote files.
   *
   * {String|Object|String[]} remoteFiles Files to install on the device;
   * if an Object, it should look like:
   *
   *   {pattern: '/home/developer/*.wgt', filter: 'latest'}
   *
   * The pattern and filter (optional) properties specify how to find the
   * files on the device; pattern is a file glob usable with ls and
   * filter can take the value 'latest', meaning install only the latest
   * matching file.
   * {Function} cb Callback; invoked with cb(error) or
   * cb(null, <filename array>)
   */
  Bridge.prototype.listRemoteFiles = function (remoteFiles, cb) {
    var logger = this.logger;

    if (_.isString(remoteFiles)) {
      cb(null, [remoteFiles]);
    }
    else if (_.isArray(remoteFiles)) {
      cb(null, remoteFiles);
    }
    else {
      // ls -1 -c returns newest file at the top of a list of filenames
      // separated by newlines
      var cmd = 'ls -1 -c ' + remoteFiles.pattern;

      // callback for when we've executed ls: filter files according
      // to remoteFiles.filter
      var resultCb = function (fileArray) {
        if (remoteFiles.filter === 'latest') {
          cb(null, [fileArray[0]]);
        }
        else {
          cb(null, fileArray);
        }
      };

      this.sdbWrapper.shell(cmd, function (err, stdout, stderr) {
        if (err) {
          logger.error('could not run ls on device');
          logger.error(err);
          logger.error(stderr);
          cb(err);
        }
        else {
          // this cleans up stdout so it contains no blank lines
          // and can be easily split
          stdout = stdout.replace(/\r/g, '');
          stdout = stdout.replace(/^\n$/g, '');
          resultCb(stdout.split('\n'));
        }
      });
    }
  };

  /**
   * Raw sdb push.
   *
   * {String} localFile Path to local file to push.
   * {String} remotePath Full destination path for file.
   * {Function} cb Callback; invoked with cb(error) or cb().
   */
  Bridge.prototype.pushRaw = function (localFile, remotePath, cb) {
    var logger = this.logger;

    this.sdbWrapper.push(localFile, remotePath, function (err, stdout, stderr) {
      if (err ||
          stderr.match('failed to copy') ||
          stderr.match('cannot stat')) {
        logger.error(stderr);
        cb(new Error('could not push file to device'));
      }
      else {
        logger.ok('pushed local:' + localFile + ' to remote:' + remotePath);
        cb();
      }
    });
  };

  /**
   * Build a remote path composed of the basename of localFile
   * appended to remoteDir.
   *
   * {String} localFile Path to a local file.
   * {String} remoteDir Remote directory path.
   */
  Bridge.prototype.getDestination = function (localFile, remoteDir) {
    var basename = path.basename(localFile);
    return path.join(remoteDir, basename);
  };

  /**
   * Copy one file to the device with overwrite protection and chmod after
   * copy is successful.
   *
   * {String} localFile Local file to push to the device.
   * {String} remoteDir Remote directory to push file to.
   * {Boolean} overwrite If set to false, push will fail if the file
   * already exists on the device.
   * {String} chmod chmod command string to apply to the file after
   * copying.
   * {Function} cb Function invoked with cb(error) if error occurred
   * or cb() if not.
   */
  Bridge.prototype.pushOne = function (localFile, remoteDir, overwrite, chmod, cb) {
    var bridge = this;
    var logger = this.logger;
    var remotePath = this.getDestination(localFile, remoteDir);

    var cbWrapped = cb;

    if (chmod) {
      // modify the callback to run chmod on the file after pushing it
      cbWrapped = function (err) {
        if (err) {
          cb(err);
        }
        else {
          bridge.chmod(remotePath, chmod, cb);
        }
      };
    }

    if (overwrite) {
      bridge.pushRaw(localFile, remotePath, cbWrapped);
    }
    else {
      bridge.fileExists(remotePath, function (err, result) {
        if (err) {
          cb(err);
        }
        else if (result) {
          logger.warn('not pushing to ' + remotePath + ' as file exists ' +
                      'and overwrite is false');
          cbWrapped();
        }
        else {
          bridge.pushRaw(localFile, remotePath, cbWrapped);
        }
      });
    }
  };

  /**
   * Push multiple files in parallel.
   *
   * {String|String[]|Object} localFiles Single file path, multiple
   * file paths, or object {pattern: 'glob'}. If an object, may also
   * contain a property filter:'latest' to retrieve just the latest
   * file in the list returned by the glob.
   * {String} remoteDir Remote directory to copy files to.
   * {Boolean} overwrite If set to false and the file exists on the
   * device, all pushes after the failed push will be aborted.
   * {String} chmod chmod command string to apply to all files after
   * copying.
   * {Function} cb Function invoked with cb(error) if error occurred
   * or cb() if not.
   */
  Bridge.prototype.push = function (localFiles, remoteDir, overwrite, chmod, cb) {
    var bridge = this;
    var logger = this.logger;

    this.fileLister.list(localFiles, function (err, filesToPush) {
      if (err) {
        cb(err);
      }
      else {
        async.each(
          filesToPush,

          function (localFile, asyncCb) {
            bridge.pushOne(localFile, remoteDir, overwrite, chmod, asyncCb);
          },

          function (err) {
            if (err) {
              logger.error(err);
              cb(new Error('error while pushing files'));
            }
            else {
              logger.ok('all files pushed');
              cb();
            }
          }
        );
      }
    });
  };

  /**
   * Run a script on the device.
   *
   * {String} remoteScript Absolute path to the remote script to run.
   * {String[]} [args=[]] Array of arguments to pass to the script.
   * {Function} cb Callback; invoked with cb(error) or cb().
   */
  Bridge.prototype.runScript = function () {
    var remoteScript = arguments[0];
    var cb = arguments[1];
    var args = [];

    if (_.isArray(cb)) {
      args = arguments[1];
      cb = arguments[2];
    }

    var logger = this.logger;

    // make the actual command which will run inside the shell
    var cmd = remoteScript;

    if (args.length) {
      cmd += ' ' + args.join(' ');
    }

    logger.ok('running: ' + cmd);

    this.sdbWrapper.shell(cmd, function (err, stdout, stderr) {
      if (err) {
        logger.error(stderr);
        cb(new Error('error occurred while running command ' + cmd));
      }
      else {
        logger.write(stdout);
        cb();
      }
    });
  };

  /**
   * Run the tizen-app.sh script on the device with command and
   * arguments array args.
   *
   * The actual command line invoked will be:
   *
   *     tizen-app.sh command arg1 arg2...
   *
   * where arg1 and arg2 etc. may be supplied in the args argument.
   *
   * {String} command The tizen-app.sh script command to run.
   * {String[]} args Arguments to pass to tizen-app.sh.
   * {Function} cb Function with signature cb(err, stdout, stderr);
   * note that this has a different signature from other parts of the
   * API as this method is only really intended for internal use, but
   * exposed to assist in testing (and it may be useful).
   */
  Bridge.prototype.runTizenAppScript = function (command, args, cb) {
    var script = this.tizenAppScriptPath;
    var logger = this.logger;

    if (!script) {
      cb(new Error('cannot run tizen-app.sh as tizenAppScriptPath ' +
                   'is not set on Bridge'));
    }
    else {
      var cmd = script + ' ' + command;

      if (args.length) {
        cmd += ' ' + args.join(' ');
      }

      this.sdbWrapper.shell(cmd, function (err, stdout, stderr) {
        // trap likely missing tizen-app.sh errors
        if (stdout.match('No such file or directory')) {
          var msg = 'ERROR: likely that tizen-app.sh is not in the ' +
                    'location ' + script + '\nTry configuring and ' +
                    'running "grunt tizen_prepare" first';
          logger.error(msg);
          cb(new Error(msg), stdout, stderr);
        }
        else {
          cb(err, stdout, stderr);
        }
      });
    }
  };

  /**
   * Install a single package on the device via tizen-app.sh, which
   * wraps pkgcmd.
   *
   * {String} remoteFile Remote wgt file already on the
   * device, which is to be installed.
   * {Function} cb Callback which receives either cb(error) or cb(null, result).
   */
  Bridge.prototype.installOne = function (remoteFile, cb) {
    var logger = this.logger;

    var installCb = function (err, stdout, stderr) {
      logger.write(stdout);

      if (err || stdout.match(/key\[end\] val\[fail\]/)) {
        logger.error('error installing package ' + remoteFile);
        logger.error(stderr);
        cb(new Error('installation failed'));
      }
      else {
        logger.ok('installed package ' + remoteFile);
        cb();
      }
    };

    this.runTizenAppScript('install', [remoteFile], installCb);
  };

  /**
   * Install one or more packages on the device.
   *
   * {String|Object|String[]} remoteFiles Remote files already on the
   * device, which are to be installed. See listRemoteFiles for
   * the structure.
   * {Function} cb Callback which receives either cb(error) or cb(null, result)
   */
  Bridge.prototype.install = function (remoteFiles, cb) {
    var self = this;
    var logger = this.logger;

    var installFiles = function (filesToInstall) {
      async.each(
        filesToInstall,

        function (fileToInstall, asyncCb) {
          self.installOne(fileToInstall, asyncCb);
        },

        function (err) {
          if (err) {
            logger.error(err);
            cb(new Error('error while installing package'));
          }
          else if (!filesToInstall.length) {
            logger.warn('no packages to install');
          }
          else {
            logger.ok('all packages installed');
          }

          cb();
        }
      );
    };

    // which files to install
    this.listRemoteFiles(remoteFiles, function (err, files) {
      if (err) {
        cb(err);
      }
      else {
        installFiles(files);
      }
    });
  };

  /**
   * Uninstall a Tizen app by ID (i.e. the ID in the <widget> element).
   *
   * {String} appId Application ID (not URI)
   * {Boolean} stopOnFailure If true and the uninstallation fails, cb(error)
   * {Function} cb Callback invoked with cb(error) on error, or cb() if
   * uninstall was OK
   */
  Bridge.prototype.uninstall = function (appId, stopOnFailure, cb) {
    var logger = this.logger;

    this.runTizenAppScript('uninstall', [appId], function (err, stdout, stderr) {
      logger.write(stdout);

      if (err || stdout.match('not installed|failed')) {
        if (stopOnFailure) {
          logger.error(stderr);
          cb(new Error('package with id ' + appId + ' could not be uninstalled'));
        }
        else {
          logger.warn('could not uninstall package; continuing anyway');
          cb();
        }
      }
      else {
        logger.ok('package with id ' + appId + ' uninstalled');
        cb();
      }
    });
  };

  /**
   * Start/stop/debug an application; wraps wrt-launcher, so it needs
   * the app's URI rather than its ID.
   *
   * {String} subcommand 'start', 'stop' or 'debug'
   * {String} appUri URI of the application.
   * {Boolean} stopOnFailure If set to true and the launch command
   * fails, cb(error) is invoked; if set to false and the command
   * fails, cb() is invoked.
   * {Function} cb Function with signature cb(err, result); if
   * subcommand is 'debug', result will match /PORT (\d+)/, where
   * the captured part of the regex is the remote port number.
   */
  Bridge.prototype.launch = function (subcommand, appUri, stopOnFailure, cb) {
    var logger = this.logger;
    var actionDone = (subcommand === 'stop' ? 'stopped' : 'launched');

    this.runTizenAppScript(subcommand, [appUri], function (err, stdout, stderr) {
      if (err || stdout.match('running|does not exist|failed')) {
        var warning = 'app with id ' + appUri + ' could not be ' + actionDone;

        if (stopOnFailure) {
          logger.error(stdout);
          logger.error(stderr);
          logger.error('could not ' + subcommand + ' app with ID ' + appUri);
          cb(new Error(warning));
        }
        else {
          logger.warn(warning + '; continuing anyway');
          cb();
        }
      }
      else {
        logger.write(stdout);
        logger.ok('app with id ' + appUri + ' ' + actionDone);

        // NB it's important that we give stdout back, as this is
        // parsed further in the tizen task to get the port number
        // for forwarding
        cb(null, stdout);
      }
    });
  };

  /**
   * Construct the debug URL for an app on TCP port localPort.
   *
   * {Integer} localPort Local debug port.
   */
  Bridge.prototype.getDebugUrl = function (localPort) {
    return 'http://localhost:' + localPort + '/inspector.html?page=1';
  };

  /**
   * Run a browser command to open the debug inspector.
   *
   * {String} browserCmd Command to open the browser; should include
   * a "%URL%" placeholder which is replaced with the debug URL, e.g.
   * "google-chrome %URL%"
   * {Integer} localPort Local port attached to the remote debug port.
   */
  Bridge.prototype.runBrowser = function (browserCmd, localPort, cb) {
    var logger = this.logger;
    var url = this.getDebugUrl(localPort);

    if (this.browserWrapper) {
      browserCmd = browserCmd.replace('%URL%', url);

      this.browserWrapper(browserCmd, function (err, stdout, stderr) {
        if (err) {
          logger.error(stderr);
          cb(err);
        }
        else {
          logger.write(stdout);
          cb();
        }
      });
    }
    else {
      var msg = 'cannot run browser: no browserWrapper configured for Bridge';
      cb(new Error(msg));
    }
  };

  /**
   * Use sdb to forward a local port to a remote debugging port on the
   * device.
   *
   * {Integer} localPort Local port to attach remote debug port to.
   * {Integer} remotePort Remote debug port on the device.
   * {Function} cb Function with signature cb(err, result).
   */
  Bridge.prototype.portForward = function (localPort, remotePort, cb) {
    var self = this;
    var logger = this.logger;

    this.sdbWrapper.forward(localPort, remotePort, function (err, stdout, stderr) {
      if (err) {
        logger.error(stderr);
        logger.error('could not forward local port to remote port');
        cb(err);
      }
      else {
        var url = self.getDebugUrl(localPort);
        logger.ok('app is ready for debugging at \n' + url);

        cb();
      }
    });
  };

  /**
   * Call "sdb root on" to make future sdb commands run as root
   * on the device.
   *
   * {Boolean} on Set to true to set root on, false to set root off
   * {Function} cb Function with signature cb(err, result).
   */
  Bridge.prototype.root = function (on, cb) {
    var logger = this.logger;
    var state = (on ? 'on' : 'off');

    this.sdbWrapper.root(on, function (err, stdout, stderr) {
      logger.write(stdout);

      if (err) {
        logger.error(stderr);
        cb(err);
      }
      else {
        if (on) {
          logger.warn('*** called "sdb root ' + state + '"; ' +
                      'commands now running as root ***');
        }
        else {
          logger.ok('*** called "sdb root ' + state + '"; ' +
                    'commands no longer running as root ***');
        }
        cb();
      }
    });
  };

  return Bridge;
};

var Bridge = construct();

module.exports = {
  create: function (config) {
    'use strict';
    return new Bridge(config);
  }
};
