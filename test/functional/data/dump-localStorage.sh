# Copyright (c) 2013, Intel Corporation.
#
# This program is licensed under the terms and conditions of the
# Apache License, version 2.0.  The full text of the Apache License is at
# http://www.apache.org/licenses/LICENSE-2.0
APP_ID=$2
KEY=$3

PATH=/opt/usr/apps/$APP_ID/data/.webkit/localStorage/file__0.localstorage
SQL="SELECT value FROM ItemTable WHERE key='$KEY'"

DATA=`/usr/bin/sqlite3 $PATH "$SQL" 2> /tmp/dump-output.txt`
RESULT="$?"

echo "*******************************************************"
echo

if [ $RESULT -eq "0" ] ; then
  echo "DUMP OF LOCALSTORAGE FOR APP $APP_ID AND KEY $KEY"
  echo
  echo $DATA
else
  echo -e "\033[31mERROR DUMPING LOCAL STORAGE FOR APP $APP_ID:\033[0m"
  /bin/cat /tmp/dump-output.txt
fi

echo
echo "*******************************************************"

