#! /usr/bin/env node
let esbuild = require('esbuild');
let chokidar = require('chokidar');

const watch = process.argv.indexOf( '--watch' ) > -1;

const entrypoint = `${__dirname}/../theme/index.tsx`;

esbuild.build({
	entryPoints: [ entrypoint ],
	bundle: true,
	outfile: './build/index.js',
	//minify: true,
	define: { 'process.env.NODE_ENV': 'true' },
	incremental: watch,
	sourcemap: true,
} ).then( result => {
	console.log( 'Build completed.' );
	if ( watch ) {
		console.log( 'Watching for further changes...' );
		chokidar.watch( './', {
			ignored: [
				/build/,
				/node_modules/
			],
			ignoreInitial: true
		} ).on( 'all', async (what, path ) => {
			console.log( what, path )
			await result.rebuild();
			console.log( 'rebuild' );
		} )
	}
})


return;

// const target = process.argv[ 2 ];
// const watch = process.argv.indexOf( '--watch' );

// const Global = `var process = {
// 	env: {
// 	  NODE_ENV: 'development'
// 	}
// };
// var isSSR = false;`

// const projectDir = '.';
// const inputOptions = {
// 	input: `${__dirname}/../theme/index.tsx`,
// 	plugins: [
// 		typescript({
// 			// tsconfig: `${ projectDir }/tsconfig.json`,
// 			jsx: 'react',
// 			rootDir: `${projectDir}/`,
// 			tslib: require('tslib'),
// 			typescript: require('typescript'),
// 			paths: {
// 				tslib: [require.resolve('tslib')],
// 			},
// 		}),
// 		commonjs(),
// 		nodeResolve({
// 			browser: true,
// 		}),
// 		css({
// 			output: 'styles.css'
// 		})
// 	],
// };
// const browserOutputOptions = {
// 	file: './build/iife/index.js',
// 	format: 'iife',
// 	banner: Global,
// 	sourcemap: true
// };

// const serverOutputOptions = {
// 	//file: './build/cjs/index.js',
// 	dir: './build/cjs/',
// 	format: 'cjs',
// 	manualChunks(id) {
// 		if ( id.includes('node_modules') ) {
// 			return 'vendor';
// 		}
// 	},
// 	chunkFileNames: '[name].js',
// };

// const outputOptions = [];
// if ( target === 'browser' ) {
// 	outputOptions.push( browserOutputOptions );
// }

// if ( target === 'server' ) {
// 	outputOptions.push( serverOutputOptions );
// }

// if ( watch ) {
// 	const watcher = rollup.watch({
// 		...inputOptions,
// 		output: outputOptions,
// 	});

// 	watcher.on('event', event => {
// 		if ( event.code === 'ERROR' ) {
// 			console.error( event );
// 		} else {
// 			console.log( event.code );
// 		}
// 	} );
// } else {
// 	// rollup
// // 	.rollup()
// // 	.then((bundle) => {
// // 		bundle.write();
// // 		bundle.write();
// // 	});


// }


