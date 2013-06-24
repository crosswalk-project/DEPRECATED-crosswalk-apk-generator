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
module.exports = function (grunt) {
  grunt.loadTasks('../../tasks');

  grunt.initConfig({
    tizen_configuration: {
      tizenAppScriptDir: '/home/developer',
      configFile: 'data/config.xml',
      sdbCmd: process.env.SDB
    },

    tizen: {
      pushFail: {
        action: 'push',
        overwrite: false,
        remoteDir: '/home/developer',
        localFiles: '../../scripts/moo.sh'
      },

      pushPackage: {
        action: 'push',
        overwrite: true,
        remoteDir: '/home/developer',
        localFiles: {
          pattern: 'data/*.wgt',
          filter: 'latest'
        }
      },

      install: {
        action: 'install',
        remoteFiles: {
          pattern: '/home/developer/*.wgt',
          filter: 'latest'
        }
      },

      uninstall: {
        action: 'uninstall'
      },

      stop: {
        action: 'stop'
      },

      start: {
        action: 'start'
      },

      debug: {
        action: 'debug',
        browserCmd: 'google-chrome %URL%'
      },

      debugNoBrowser: {
        action: 'debug'
      },

      pushDumpScript: {
        action: 'push',
        localFiles: 'data/dump-localStorage.sh',
        chmod: '+x',
        remoteDir: '/home/developer',
        overwrite: true
      },

      runDumpScript: {
        action: 'script',
        remoteScript: '/home/developer/dump-localStorage.sh',
        asRoot: true,
        args: ['test']
      },

      runDumpScriptFail: {
        action: 'script',
        remoteScript: '/home/developer/dump-localStorage.sh',
        args: ['test']
      }
    }
  });

  grunt.registerTask('default', [
    'tizen_prepare',
    'tizen:stop',
    'tizen:pushPackage',
    'tizen:uninstall',
    'tizen:install',
    'tizen:debug'
  ]);

  grunt.registerTask(
    'dump',
    'Dump contents of local storage for the app',
    [
      'tizen:pushDumpScript',
      'tizen:runDumpScript'
    ]
  );
};
