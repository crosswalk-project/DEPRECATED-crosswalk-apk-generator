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
      unit: {
        files: { src: 'test/unit/*.test.js' },
        reporter: 'dot'
      }
    }
  });

  grunt.registerTask('test', 'mochaccino:unit');
  grunt.registerTask('cov', 'mochaccino:cov');
  grunt.registerTask('default', 'test');
};
