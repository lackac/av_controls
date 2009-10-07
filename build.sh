#!/bin/bash
# build.sh -- builds JAR and XPI files for mozilla extensions
#   by Nickolay Ponomarev <asqueella@gmail.com>
#   (original version based on Nathan Yergler's build script)
# Most recent version is at <http://kb.mozillazine.org/Bash_build_script>

# 2009-06-16
# Changed script to use a zippable layout
# Use -c for config file argument, -v for new version
# Updates version information in install.rdf and overlay.js
#   by László Bácsi <lackac@lackac.hu>

# This script assumes the following directory structure:
# ./
#   chrome.manifest (optional - for newer extensions)
#   install.rdf
#   (other files listed in $ROOT_FILES)
#
#   chrome/
#     content/    |
#     locale/     |} these can be named arbitrary and listed in $CHROME_PROVIDERS
#     skin/       |
#
#   defaults/   |
#   components/ |} these must be listed in $ROOT_DIRS in order to be packaged
#   ...         |
#
# It uses a temporary directory ./build when building; don't use that!
# Script's output is:
# ./$APP_NAME.xpi
# ./$APP_NAME.jar  (only if $KEEP_JAR=1)
# ./files -- the list of packaged files
#
# Note: It modifies chrome.manifest when packaging so that it points to 
#       chrome/$APP_NAME.jar!/*

#
# default configuration file is ./config_build.sh, unless another file is 
# specified with the -c command-line argument. Available config variables:
APP_NAME=          # short-name, jar and xpi files name. Must be lowercase with no spaces
CHROME_PROVIDERS=  # which chrome providers we have (space-separated list)
CLEAN_UP=          # delete the jar / "files" when done?       (1/0)
ROOT_FILES=        # put these files in root of xpi (space separated list of leaf filenames)
ROOT_DIRS=         # ...and these directories       (space separated list)
BEFORE_BUILD=      # run this before building       (bash command)
AFTER_BUILD=       # ...and this after the build    (bash command)

ARGS="$@"
CONFIG_FILE=./config_build.sh

while [ "$1" != "" ]; do
  case $1 in
    -c | --config )       shift
                          CONFIG_FILE=$1
                          ;;
    -v | --new-version )  shift
                          VERSION=$1
                          ;;
    * )                   ;;
  esac
  shift
done

. $CONFIG_FILE

if [ -z $APP_NAME ]; then
  echo "You need to create build config file first!"
  echo "Read comments at the beginning of this script for more info."
  exit;
fi

ROOT_DIR=`pwd`
TMP_DIR=build

#uncomment to debug
#set -x

# remove any left-over files from previous build
rm -f $APP_NAME.jar $APP_NAME.xpi files
rm -rf $TMP_DIR

$BEFORE_BUILD

# update version info in install.rdf and overlay.js if new version was provided
if [ -n "$VERSION" ]; then
  echo "Updating version to $VERSION..."
  perl -i -pe "s/<em:version>[^<]*<\/em:version>/<em:version>$VERSION<\/em:version>/" install.rdf
  perl -i -pe "s/^(\s*(($APP_NAME|this)\.)?version\s*[:=]\s*)['\"][^'\"]*['\"]/\1'$VERSION'/i" chrome/content/overlay.js
fi

mkdir --parents --verbose $TMP_DIR/chrome

# generate the JAR file, excluding CVS and temporary files
JAR_FILE=$TMP_DIR/chrome/$APP_NAME.jar
echo "Generating $JAR_FILE..."
for CHROME_SUBDIR in $CHROME_PROVIDERS; do
  find chrome/$CHROME_SUBDIR -path '*CVS*' -prune -o -type f -print | grep -v \~ >> files
done

zip -0 -r $JAR_FILE `cat files`
# The following statement should be used instead if you don't wish to use the JAR file
#cp --verbose --parents `cat files` $TMP_DIR/chrome

# prepare components and defaults
echo "Copying various files to $TMP_DIR folder..."
for DIR in $ROOT_DIRS; do
  mkdir $TMP_DIR/$DIR
  FILES="`find $DIR -path '*CVS*' -prune -o -type f -print | grep -v \~`"
  echo $FILES >> files
  cp --verbose --parents $FILES $TMP_DIR
done

# Copy other files to the root of future XPI.
for ROOT_FILE in $ROOT_FILES install.rdf chrome.manifest; do
  cp --verbose $ROOT_FILE $TMP_DIR
  if [ -f $ROOT_FILE ]; then
    echo $ROOT_FILE >> files
  fi
done

cd $TMP_DIR

if [ -f "chrome.manifest" ]; then
  echo "Preprocessing chrome.manifest..."
  # adds jar:chrome/whatever.jar!/ at appropriate positions of chrome.manifest
  perl -i -pe "s/^(content\s+\S*\s+)(\S*\/)$/\1jar:chrome\/$APP_NAME\.jar!\/\2/" chrome.manifest
  perl -i -pe "s/^(skin|locale)(\s+\S*\s+\S*\s+)(.*\/)$/\1\2jar:chrome\/$APP_NAME\.jar!\/\3/" chrome.manifest
fi

# generate the XPI file
echo "Generating $APP_NAME.xpi..."
zip -r ../$APP_NAME.xpi *

cd "$ROOT_DIR"

echo "Cleanup..."
if [ $CLEAN_UP = 0 ]; then
  # save the jar file
  mv $TMP_DIR/chrome/$APP_NAME.jar .
else
  rm ./files
fi

# remove the working files
rm -rf $TMP_DIR
echo "Done!"

$AFTER_BUILD
