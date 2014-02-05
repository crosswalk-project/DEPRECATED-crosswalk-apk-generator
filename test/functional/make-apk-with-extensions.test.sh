#!/bin/bash
# Copyright (c) 2014 Intel Corporation. All rights reserved.
# Use of this source code is governed by an Apache v2 license that can be
# found in the LICENSE-APACHE-V2 file.

# an example of building an app with extensions from the command line;
# it builds an apk from the code in app-with-extensions
if [ "x" = "x$androidSDKDir" ] ; then
  echo echo 'Please set the androidSDKDir environment variable first'
  exit 1
fi

if [ "x" = "x$xwalkAndroidDir" ] ; then
  echo echo 'Please set the xwalkAndroidDir environment variable first'
  exit 1
fi

WD=`dirname $0`
OUT_DIR=$WD/build/make-apk-with-extensions

$WD/../../bin/xwalk_apkgen --embedded --app-root $WD/app-with-extensions/app --app-local-path index.html --name "X make apk with extensions test sh" --package "make.apk.with.extensions" --remoteDebugging --ext-config $WD/app-with-extensions/xwalk-extensions/config.json --jars $WD/app-with-extensions/jars/commons-io-2.4.jar,$WD/app-with-extensions/jars/commons-lang3-3.1.jar,$WD/app-with-extensions/jars/entagged-audioformats-0.15.jar,$WD/app-with-extensions/jars/gson-2.2.4.jar --javaSrcDirs $WD/app-with-extensions/xwalk-extensions/java/ -a $androidSDKDir -x $xwalkAndroidDir -o $OUT_DIR $*
