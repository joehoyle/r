#! /usr/bin/env node
const rollup = require('rollup');
//const config = require('../rollup.config.js');
const typescript = require('@rollup/plugin-typescript');

const projectDir = '.';

rollup.rollup({
    input: `${ __dirname }/../index.tsx`,
    plugins: [
		typescript({
			// tsconfig: `${ projectDir }/tsconfig.json`,
			jsx: 'react',
			rootDir: `${ projectDir }/`,
			tslib: require.resolve('tslib'),
		})
	]
} )
