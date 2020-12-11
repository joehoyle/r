#! /usr/bin/env node
let esbuild = require('esbuild');
let chokidar = require('chokidar');
const fs = require( 'fs' );
const { createServer } = require('vite')
const viteReact = require('vite-plugin-react')

const watch = process.argv.indexOf( '--watch' ) > -1;
const hmr = process.argv.indexOf( '--hmr' ) > -1;

const entrypoint = `${__dirname}/../theme/index.tsx`;

// Get all template files and make sure they are in the build. Because they are
// dynamically loaded, the esbuild entrypoint will not find them.
const knownNonTemplates = [ 'Header', 'Footer', 'Layout' ];
const files = fs.readdirSync( './' ).filter( file => file.endsWith( '.tsx' ) ).map( file => file.replace( '.tsx', '' ) ).filter( f => knownNonTemplates.indexOf( f ) === -1 )
const file = `
${ files.map( file => `import Template${ file } from "../../../${ file }";` ).join( '\n' ) }
export { ${ files.map( t => `Template${ t }` ).join( ", " ) } };
`

fs.writeFileSync( __dirname + '/../theme/templates.ts', file );

esbuild.build({
	entryPoints: [ entrypoint ],
	bundle: true,
	outfile: './build/index.js',
	//minify: true,
	define: { 'process.env.NODE_ENV': 'true' },
	incremental: watch,
	sourcemap: true,
	target: 'es6',
} ).then( result => {
	console.log( 'Build completed.' );
	if ( watch ) {
		console.log( 'Watching for further changes...' );
		chokidar.watch( './', {
			ignored: [
				/build/,
				///node_modules/
			],
			ignoreInitial: true
		} ).on( 'all', async (what, path ) => {
			console.log( what, path )
			await result.rebuild();
			console.log( 'rebuild' );
		} )
	}
});

if ( hmr ) {
	createServer({
		configureServer: [ viteReact.configureServer ],
		transforms: viteReact.transforms,
		cors: true,
		jsx: 'react',
		optimizeDeps: {
			exclude: [ 'wordpress-r', 'postcss-cli', 'postcss' ],
			include: [ 'react-helmet', 'react-dom/server', 'prop-types', 'react-router-dom', 'react-router' ],
		},
		resolvers: [
			{
				alias: ( file ) => {
					if ( file === 'wordpress-r' ) {
						return '/node_modules/wordpress-r/index.js'
					}
					return file;
				}
			}
		],
		mode: 'development',
		hmr: {
			hostname: 'localhost',
			protocol: 'ws',
		},
		secure: true

	} ).listen(3000)
	console.log( `Listening on post 3000` );
}

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


