#!/bin/bash
# Copyright (c) 2014 Intel Corporation. All rights reserved.
# Use of this source code is governed by an Apache v2 license that can be
# found in the LICENSE-APACHE-V2 file.

# for testing the xwalk_apkgen and xwalk_android_dl scripts
# this downloads the latest x86 xwalk-android and unpacks it,
# then outputs a build skeleton and apks in test/functional/build/make_apk

if [ "x" = "x$androidSDKDir" ] ; then
  echo 'Please set the androidSDKDir environment variable first'
  exit 1
fi

if [ "x" = "x$xwalkAndroidDir" ] ; then
  echo echo 'Please set the xwalkAndroidDir environment variable first'
  exit 1
fi

WD=`dirname $0`
OUT_DIR=$WD/build/make_apk

# make the apk
$WD/../../bin/xwalk_apkgen -o $OUT_DIR --appRoot=$WD/demo-app --appLocalPath=index.html --name "X make apk test sh" --package "make.apk" --icon "$WD/demo-app/icon.png" --mode "embedded" --keystore $WD/custom-keystore/mycerts.jks --keystoreAlias my --keystorePassword demodemo --remoteDebugging --version 1.0.0 $*
