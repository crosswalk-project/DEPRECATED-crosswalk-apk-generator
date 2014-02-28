#!/bin/bash
# Copyright (c) 2014 Intel Corporation. All rights reserved.
# Use of this source code is governed by an Apache v2 license that can be
# found in the LICENSE-APACHE-V2 file.

# note that you'll need to install the XWalkRuntimeLib.apk on the client
# first for the output apk to work

if [ "x" = "x$androidSDKDir" ] ; then
  echo 'Please set the androidSDKDir environment variable first'
  exit 1
fi

if [ "x" = "x$xwalkAndroidDir" ] ; then
  echo echo 'Please set the xwalkAndroidDir environment variable first'
  exit 1
fi

WD=`dirname $0`
OUT_DIR=$WD/build/make_apk_shared

# make the apk
$WD/../../bin/xwalk_apkgen -o $OUT_DIR --appRoot=$WD/demo-app --appLocalPath=index.html --name "X make apk shared test sh" --package "make.apk" --icon "$WD/demo-app/icon.png" --mode "shared" --keystore $WD/custom-keystore/mycerts.jks --keystoreAlias my --keystorePassword demodemo --remoteDebugging --version 1.0.0 $*
