module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mochaccino');

  grunt.initConfig({
    jshint: {
      all: ['lib/**/*.js', 'tasks/**'],

      // see http://jshint.com/docs/
      options: {
        camelcase: true,
        curly: true,
        eqeqeq: true,
        forin: true,
        immed: true,
        indent: 2,
        noempty: true,
        quotmark: 'single',

        undef: true,
        globals: {
          'require': false,
          'module': false,
          'process': false,
          '__dirname': false
        },

        unused: true,
        browser: true,
        strict: true,
        trailing: true,
        maxdepth: 2,
        newcap: false
      }
    },

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
