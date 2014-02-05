#!/bin/bash
# Copyright (c) 2014 Intel Corporation. All rights reserved.
# Use of this source code is governed by an Apache v2 license that can be
# found in the LICENSE-APACHE-V2 file.

# perform a clean build using all functional test scripts;
# this removes the content of the build directory first
WD=`dirname $0`
latest_version=`node get-xwalk-android-x86-latest.js`
export xwalkAndroidDir="$WD/crosswalk-$latest_version-x86/xwalk_app_template"
rm -Rf $WD/build/

echo
echo "--------------------- MAKE-APK.TEST.SH"
$WD/make-apk.test.sh $xwalkAndroidDir

echo
echo "--------------------- MAKE-APK-WITH_EXTENSIONS.TEST.SH"
$WD/make-apk-with-extensions.test.sh

echo
echo "--------------------- SIMPLE-API-EXAMPLE.JS"
node $WD/simple-api-example.js $androidSDKDir $xwalkAndroidDir $WD/demo-app/

echo
echo "--------------------- EMBEDDED-API-EXAMPLE.JS"
node $WD/embedded-api-example.js $androidSDKDir $xwalkAndroidDir $WD/demo-app/

echo
echo "--------------------- EXTENSIONS-API-EXAMPLE.JS"
node $WD/extensions-api-example.js $androidSDKDir $xwalkAndroidDir

apks=`find $WD/build/ -name *.apk | grep -v signed | grep -v unsigned`

echo
echo '**********************************************************'
echo 'OUTPUT apks:'

for apk in $apks ; do
  echo $apk
done
