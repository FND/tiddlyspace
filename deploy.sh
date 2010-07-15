#!/usr/bin/env sh

# Usage:
#   $ ./deploy.sh <username> <password> [space [host]]

set -e
set -x

username=${1:?}
password=${2:?}
space=${3-$username}
host=${4-http://tiddlyspace.com}

recipe="${space}_public"
options="-X PUT -u $username:$password"

title="TiddlySpaceActivities"
ctype="text/javascript"
{ echo "type: $ctype"; echo "tags: systemConfig"; echo; cat "src/$title.js"; } | \
	curl $options -H "Content-Type: text/plain" --data-binary @- \
		"$host/recipes/$recipe/tiddlers/$title"
