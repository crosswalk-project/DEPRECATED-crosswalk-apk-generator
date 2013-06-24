grunt-tizen is a grunt plugin for installing, uninstalling, running and debugging applications on a Tizen device.

# Getting started

This plugin requires Grunt ~0.4.0.

If you are only interested in using grunt-tizen in your own project, you can install it with:

    npm install grunt-tizen --save-dev

Once the plugin has been installed, enable it with a line of JavaScript in your Gruntfile.js:

    module.exports = function (grunt) {
      grunt.loadNpmTasks('grunt-tizen');

      // grunt.initConfig() etc.
    };

If you are interested in contributing to the project, the HACKING.md file explains more about building grunt-tizen and running its test suite.

# Dependencies

Note that grunt-tizen depends on the <code>sdb</code> command line tool. This is available for various platforms from http://download.tizen.org/tools/latest-release/. If you want to use the <code>asRoot</code> option for the tizen task, you will need a very recent version of sdb with support for the "root" command (e.g. the tizen_2.0 branch). All of the other tizen:* tasks work with older versions of sdb, however.

You will also need a device running a recent version of Tizen 2.1/2.2. The device should be connected to the host running grunt via a USB connection.

This plugin has not been tested with multiple simultaneous USB connections to Tizen devices. It is unlikely to work in such an environment.

# Configuration

The base configuration for both tasks (<code>tizen_prepare</code> and <code>tizen</code>)

# Tasks

## tizen_prepare task

???

## tizen task

???
