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
