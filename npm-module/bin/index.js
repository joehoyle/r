#! /usr/bin/env node
const rollup = require('rollup');
//const config = require('../rollup.config.js');
const typescript = require('@rollup/plugin-typescript');
const commonjs = require('@rollup/plugin-commonjs');
const nodeResolve = require('@rollup/plugin-node-resolve').nodeResolve;

const Global = `var process = {
	env: {
	  NODE_ENV: 'development'
	}
};
var isSSR = false;`

const projectDir = '.';
const inputOptions = {
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
};
const browserOutputOptions = {
	file: './build/iife/index.js',
	format: 'iife',
	banner: Global,
	sourcemap: true
};

const serverOutputOptions = {
	file: './build/cjs/index.js',
	format: 'cjs',
	manualChunks(id) {
		if ( id.includes('node_modules') ) {
			return 'vendor';
		}
	}
};

const watcher = rollup.watch({
	...inputOptions,
	output: [ browserOutputOptions, serverOutputOptions ],
});

watcher.on('event', event => {
	console.log( event );
} );

// rollup
// 	.rollup()
// 	.then((bundle) => {
// 		bundle.write();
// 		bundle.write();
// 	});
