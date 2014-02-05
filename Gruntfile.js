/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var shell = require('shelljs');

module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-mochaccino');
  grunt.loadNpmTasks('grunt-release');

  grunt.registerTask('copyDocs', function () {
    if (shell.test('-d', 'build/docs-raw')) {
      shell.rm('-r', 'build/docs-raw');
    }
    shell.mkdir('-p', 'build/docs-raw/tutorials');

    // add links to HACKING.md in README.md so they point to
    // the output HTML file
    shell.cat('README.md')
    .replace(/HACKING\.md/g, '[HACKING](tutorial-HACKING.html)')
    .to('build/docs-raw/README.md');

    // add links from HACKING.md to README.md
    shell.cat('HACKING.md')
    .replace(/README.md/g, '[README](index.html)')
    .to('build/docs-raw/tutorials/HACKING.md');
  });

  grunt.initConfig({
    jshint: {
      all: {
        files: {src: 'src/**/*.js' },
        options: {
          jshintrc: '.jshintrc'
        }
      }
    },

    jsdoc : {
      all : {
        src: [
          'build/docs-raw/README.md',
          'data/doc-tools/external-namespaces.js',
          'src/app.js',
          'src/app-skeleton.js',
          'src/archive-fetcher.js',
          'src/build-tools.js',
          'src/command-runner.js',
          'src/console-logger.js',
          'src/downloader.js',
          'src/env.js',
          'src/finder.js',
          'src/locations.js',
          'src/unpacker.js',
          'src/wrappers/aapt-wrapper.js',
          'src/wrappers/dx-wrapper.js',
          'src/wrappers/apk-gen-wrapper.js',
          'src/wrappers/apk-sign-wrapper.js',
          'src/wrappers/javac-wrapper.js'
        ],
        options: {
          destination: 'build/docs',
          tutorials: 'build/docs-raw/tutorials'
        }
      }
    },

    mochaccino: {
      cov: {
        files: [
          { src: 'test/unit/*.test.js' }
        ],
        reporter: 'html-cov',
        reportDir: 'build'
      },

      unit: {
        files: { src: 'test/unit/*.test.js' },
        reporter: 'dot'
      }
    },

    release: {
      options: {
        add: true,
        commit: true,
        push: true,

        bump: true,
        tag: true,
        pushTags: true,
        npm: true,
        folder: '.',
        tagName: '<%= version %>',
        tagMessage: 'Version <%= version %>'
      }
    }
  });

  grunt.registerTask('cov', 'mochaccino:cov');
  grunt.registerTask('test', 'mochaccino:unit');
  grunt.registerTask('docs', ['copyDocs', 'jsdoc']);
  grunt.registerTask('default', ['jshint', 'test']);
};
