#!/bin/bash

set -ex

pm2 list
npm stop
mv data data_1;
mkdir data;
mv data_1/credentials.json data;
mv data_1/media_downloader.sqlite data;
find ./data_1 -type f | wc -l;
npm start
tar -cf data.tar.gz data_1;
