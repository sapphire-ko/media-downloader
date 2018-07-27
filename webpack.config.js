const path = require('path');

const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

module.exports = {
	'entry': path.resolve(__dirname, './src', 'twitter.ts'),
	'output': {
		'path': path.resolve(__dirname, './dist'),
		'filename': 'main.js',
	},
	'module': {
		'rules': [
			{
				'test': /\.js?$/,
				'use': {
					'loader': 'babel-loader',
				},
			},
			{
				'test': /\.tsx?$/,
				'use': [
					'ts-loader',
				],
			},
		],
	},
	'plugins': [
		new webpack.ProgressPlugin(),
	],
	'devtool': '#source-map',
	'resolve': {
		'extensions': [
			'.ts',
			'.tsx',
			'.js',
			'.json',
		],
	},
	'target': 'node',
	'node': {
		'__dirname': true,
	},
	'externals': [
		nodeExternals(),
	],
	'mode': 'development',
};
