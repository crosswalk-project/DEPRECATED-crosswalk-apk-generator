module.exports = function (grunt) {
  grunt.loadTasks('../../tasks');

  grunt.initConfig({
    tizen: {
      pushFail: {
        action: 'push',
        overwrite: false,
        remoteDir: '/home/developer',
        localFiles: '../../scripts/tizen-app.sh'
      },

      push: {
        action: 'push',
        overwrite: true,
        chmod: '+x',
        remoteDir: '/home/developer',
        localFiles: '../../scripts/tizen-app.sh'
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
        remoteScript: '/home/developer/tizen-app.sh',
        remoteFiles: {
          pattern: '/home/developer/*.wgt',
          filter: 'latest'
        }
      },

      uninstall: {
        action: 'uninstall',
        remoteScript: '/home/developer/tizen-app.sh'
      },

      stop: {
        action: 'stop',
        remoteScript: '/home/developer/tizen-app.sh'
      },

      start: {
        action: 'start',
        remoteScript: '/home/developer/tizen-app.sh'
      },

      debug: {
        action: 'debug',
        remoteScript: '/home/developer/tizen-app.sh',
        browserCmd: 'google-chrome %URL%'
      },

      debugNoBrowser: {
        action: 'debug',
        remoteScript: '/home/developer/tizen-app.sh'
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
    'tizen:push',
    'tizen:pushDumpScript',
    'tizen:stop',
    'tizen:pushPackage',
    'tizen:uninstall',
    'tizen:install',
    'tizen:debug',
    'tizen:runDumpScript'
  ]);
};
