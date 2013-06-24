# Getting the source

Checkout the project from github with:

    git clone https://github.com/01org/grunt-tizen.git

The instructions below assume you are working from inside the grunt-tizen project root (i.e. the directory you cloned the repo to).

# <a id="Build pre-requisites"></a>Build pre-requisites

You will need to install node and npm (the latter is included in recent versions of node).

Once you have these, install the dependencies for the project with:

    npm install .

If you want to run the test suites, you will need a global install of mocha:

    npm install -g mocha

# Build tasks

grunt-tizen doesn't require any compilation, but does have a couple of tasks for developer use:

*   grunt clean
    Remove the build/ directory.

*   grunt lint
    Lint the code in the tasks/ and lib/ directories.

# Tests

The test suites use the grunt-mochaccino task to run. This has the advantage of running the tests using the command line mocha, so you get the full output from that tool (for whatever reason, the mocha library seems to give less detail about test failures than the command-line tool).

It has the disadvantage of requiring that you have the mocha library installed globally. See the [Build pre-requisites section](#Build pre-requisites) above for details.

## Unit tests

The unit tests work with mocked and stubbed dependencies, so shouldn't touch the filesystem or attached Tizen devices.

Run them with:

    grunt test

## Integration tests

The integration tests work with the real filesystem and environment to check that the task components work correctly. However, they do not manage any real packages or interact with attached devices.

Run them with:

    grunt test-int

## Coverage report

You can produce a coverage report for the unit and integration tests.

From the grunt-tizen project root, do:

    grunt cov

The coverage reports are put into the build/ directory.

## Functional tests

The functional tests run "real" tasks to deploy a pre-prepared wgt package to an attached Tizen device.

To run the integration tests:

1.  Connect a Tizen device to the host machine (the host is the machine running grunt).

2.  On the host, connect to the directory inside your grunt-tizen clone where the test files are located:

        $ cd test/functional

    This directory contains a <code>Gruntfile.js</code> configured to deploy the package test/functional/data/test-app.wgt.

3.  Run the default task, ensuring that you set an environment variable to the location of your sdb binary:

        $ SDB=/home/bilbo/bin/sdb grunt

    This will run <code>tizen_prepare</code>, then stop, uninstall, install and debug the package.

The functional tests also have a second task to dump the content of a localStorage variable to the console, for testing the sdb root on/off functionality. Note that this requires a very recent sdb version to work.

To run this task, do:

    $ SDB=/home/bilbo/bin/sdb grunt dump
