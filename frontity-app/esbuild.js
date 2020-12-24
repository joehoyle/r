const { build } = require('esbuild')
const fs = require('fs');

let nodeFetchPlugin = {
	name: 'example',
	setup(build) {
		let path = require('path')

		// Redirect all paths starting with "images/" to "./public/images/"
		build.onResolve({ filter: /^react-dom\/server/ }, args => {
			return { path: __dirname + '/node_modules/react-dom/cjs/react-dom-server.browser.development.js' }
		});

		build.onResolve({ filter: /^node-fetch$/ }, args => {
			return { path: __dirname + '/build/bundling/entry-points/fetch.ts' }
		})

		build.onLoad({ filter: /node_modules\/@loadable\/component\/dist\/loadable.cjs.js$/ }, async args => {
			try {
				const file = String( await fs.promises.readFile( args.path ) )
				const contents = file.replace("BROWSER = typeof window !== 'undefined'",'BROWSER = false')
				return {
					contents,
				}
			} catch ( e ) {
				console.error(e);
			}
			return undefined;
		})
	},
}

build({
	entryPoints: ['./v8js/bundling/entry-points/node.ts'],
	outfile: 'server-bundle.js',
	//minify: true,
	bundle: true,
	target: 'es2018',
	plugins: [ nodeFetchPlugin ],
	// sourcemap: true,
	loader: {
		'.js': 'jsx',
		'.ts': 'tsx',
	},
	define: { 'process.env.NODE_ENV': 'true' },
	// define: {
	// 	'process.env.NODE_ENV':'"development"',
	// },
	external: [
		'he',
		// 'node-fetch'
	],
	platform: 'node',

})
// .then( async () => {
// 	const file = String(await fs.promises.readFile( './server-bundle.js' ))
// 		.replace( 'var isBrowser = typeof document !== "undefined"', 'var is Browser = false' );
// 	fs.promises.writeFile( './server-bundle-new.js', file );
// })
.catch((e) => {
	console.log(e);
	process.exit(1)
})
