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
// Custom plugin to force load the react-server node library and deps.
let reactServerPlugin = {
	name: 'example',
	setup(build) {
		build.onResolve({ filter: /react-dom\/server/ }, args => {
			console.log( args );
			return {
				path: `${ __dirname }/../../react-dom/cjs/react-dom-server.node.development.js`,
			}
		});
	},
}

fs.writeFileSync( __dirname + '/../theme/templates.ts', file );

esbuild.build({
	entryPoints: [ entrypoint ],
	bundle: true,
	outfile: './build/index.js',
	//minify: true,
	define: { 'process.env.NODE_ENV': 'true' },
	incremental: watch,
	sourcemap: true,
	target: 'es2018',
	// platform: 'node',
	plugins: [ reactServerPlugin ]
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
		alias: {
			"/wordpress-r/": "/home/altis/skeleton/content/themes/my-theme/node_modules/wordpress-r/"
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
