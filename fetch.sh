#!/bin/bash

set -ex

function fetch {
	npm run fetch:3 e && npm run download
	sleep 120
}

fetch
fetch
fetch
fetch
fetch
fetch
fetch
fetch
fetch
fetch
