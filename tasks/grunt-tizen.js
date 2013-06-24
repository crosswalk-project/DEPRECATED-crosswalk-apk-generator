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

/**
 * grunt-tizen: Tizen-related tasks for grunt
 */
var bridgeMaker = require('../lib/bridge-maker');
var tizenConfigMaker = require('../lib/tizen-config-maker');
var tasksMaker = require('../lib/tasks-maker');

module.exports = function (grunt) {
  'use strict';

  // the tasks have to be constructed on the fly,
  // as the configuration they need is not available until the point
  // where a task is invoked from grunt; however, we can cache
  // them once we've generated them, as they will not change for
  // any particular sequence of tasks run together
  var tasks = null;

  var makeTasks = function (config) {
    if (!tasks) {
      var bridge = bridgeMaker(config);
      var tizenConfig = tizenConfigMaker(config);
      tasks = tasksMaker({bridge: bridge, tizenConfig: tizenConfig});
    }

    return tasks;
  };

  /**
   * tizen_prepare
   * Task to push the tizen-app.sh script to the device.
   *
   * See README.md for details.
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
   * Task to wrap sdb on the host and related commands on the target
   * device.
   *
   * See README.md for details.
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
