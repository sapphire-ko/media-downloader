#!/bin/bash

set -ex

function fetch {
	TYPE="$1"

	npm run fetch "$TYPE"
	npm run download
}

fetch a
sleep $((10 * 60))
fetch b
