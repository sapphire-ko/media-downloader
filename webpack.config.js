const path = require('path');

const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

const env = process.env.NODE_ENV === 'development' ? 'development' : 'production';

const rootPath = path.resolve(__dirname, '.');
const srcPath = path.resolve(rootPath, 'src');
const distPath = path.resolve(rootPath, 'dist');
const dataPath = path.resolve(rootPath, 'data');

const __env = require('./env.json');

module.exports = {
	'entry': {
		// 'main': path.resolve(srcPath, 'index.ts'),
		'fetch': path.resolve(srcPath, 'fetch.ts'),
		'user': path.resolve(srcPath, 'user.ts'),
		'download': path.resolve(srcPath, 'download.ts'),
	},
	'output': {
		'path': distPath,
		'filename': '[name].js',
	},
	'module': {
		'rules': [
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
		new webpack.DefinePlugin({
			'__dev': env === 'development',
			'__path': JSON.stringify({
				'root': rootPath,
				'src': srcPath,
				'dist': distPath,
				'data': dataPath,
			}),
		}),
		new webpack.DefinePlugin(Object.keys(__env).map((e) => {
			return {
				[`__${e}`]: JSON.stringify(__env[e]),
			};
		}).reduce((a, b) => {
			return Object.assign(a, b);
		}, {})),
	],
	'devtool': 'source-map',
	'resolve': {
		'extensions': [
			'.ts',
			'.tsx',
			'.js',
			'.json',
		],
		'alias': {
			'~': srcPath,
		},
	},
	'target': 'node',
	'node': {
		'__dirname': true,
	},
	'externals': [
		nodeExternals(),
	],
	'mode': env,
};
