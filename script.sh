#!/bin/bash

set -ex

npm stop
mv data data_1;
mkdir data;
mv data_1/credentials.json data;
mv data_1/media_downloader.sqlite data;
npm start
tar -cvf data.tar.gz data_1;

