#! /usr/bin/env node
const rollup = require('rollup');
//const config = require('../rollup.config.js');
const typescript = require('@rollup/plugin-typescript');
const commonjs = require('@rollup/plugin-commonjs');
const nodeResolve = require('@rollup/plugin-node-resolve').nodeResolve;
const css = require( 'rollup-plugin-css-only' );

const target = process.argv[ 2 ];
const watch = process.argv.indexOf( '--watch' );

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
		css({
			output: 'styles.css'
		})
	],
};
const browserOutputOptions = {
	file: './build/iife/index.js',
	format: 'iife',
	banner: Global,
	sourcemap: true
};

const serverOutputOptions = {
	//file: './build/cjs/index.js',
	dir: './build/cjs/',
	format: 'cjs',
	manualChunks(id) {
		if ( id.includes('node_modules') ) {
			return 'vendor';
		}
	},
	chunkFileNames: '[name].js',
};

const outputOptions = [];
if ( target === 'browser' ) {
	outputOptions.push( browserOutputOptions );
}

if ( target === 'server' ) {
	outputOptions.push( serverOutputOptions );
}

if ( watch ) {
	const watcher = rollup.watch({
		...inputOptions,
		output: outputOptions,
	});

	watcher.on('event', event => {
		if ( event.code === 'ERROR' ) {
			console.error( event );
		} else {
			console.log( event.code );
		}
	} );
} else {
	// rollup
// 	.rollup()
// 	.then((bundle) => {
// 		bundle.write();
// 		bundle.write();
// 	});


}


