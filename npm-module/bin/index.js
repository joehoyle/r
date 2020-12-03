#! /usr/bin/env node
const rollup = require('rollup');
//const config = require('../rollup.config.js');
const typescript = require('@rollup/plugin-typescript');
const commonjs = require('@rollup/plugin-commonjs');
const nodeResolve = require('@rollup/plugin-node-resolve').nodeResolve;

const projectDir = '.';
console.warn(require.resolve('tslib'));
rollup
	.rollup({
		input: `${__dirname}/../theme/index.tsx`,
		plugins: [
			typescript({
				// tsconfig: `${ projectDir }/tsconfig.json`,
				jsx: 'react',
				rootDir: `${projectDir}/`,
				tslib: require('tslib'),
				typescript: require('typescript'),
				paths: {
					tslib: [require.resolve('tslib')],
				},
			}),
			commonjs(),
			nodeResolve({
				browser: true,
			}),
		],
	})
	.then((bundle) => {
		bundle.write({
			file: './build/csj/index.js',
			format: 'cjs'
		});
		bundle.write({
			file: './build/es/index.js',
			format: 'es'
		});
	});
