module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-mochaccino');

  grunt.initConfig({
    mochaccino: {
      cov: {
        files: { src: 'test/unit/*.test.js' },
        reporter: 'html-cov',
        reportDir: 'build',
        browserCmd: 'google-chrome'
      },
      all: {
        files: { src: 'test/unit/*.test.js' },
        reporter: 'dot'
      }
    }
  });

  grunt.registerTask('test', 'mochaccino:all');
  grunt.registerTask('default', 'test');
};
