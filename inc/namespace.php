<?php

namespace R;

use Exception;
use V8Js;
use V8JsScriptException;
use axy\sourcemap\SourceMap;

function bootstrap() : void {
	register_theme_directory( dirname( __DIR__ ) . '/theme-directory/' );
}

function get_init_data() : array {
	return [
		'rewrite' => get_rewrites(),
	];
}
/**
 * @return list<array{ uri: string, params: array<string, string>}>
 */
function get_rewrites() {
	global $wp_rewrite;
	/** @var array<string, string> */
	$rules = $wp_rewrite->wp_rewrite_rules();
	$rest_rules = array_map( __NAMESPACE__ . '\\get_rest_api_query_for_rewrite_query', $rules );
	// Strip all rewrites that don't have REST queries.
	$rest_rules = array_filter( $rest_rules );

	// Add homepage
	if ( get_option( 'show_on_front' ) === 'page' ) {
		// Push homepage rule on to start of array
		$rest_rules = [
			'^/?$' => [
				'uri' => get_rest_url( null, '/wp/v2/pages/' . get_option( 'page_on_front' ) ),
				'params' => [],
			]
		] + $rest_rules;
	}

	return $rest_rules;
}

/**
 * @return ?array{ uri: string, params: array<string, string>}|null
 */
function get_rest_api_query_for_rewrite_query( string $query ) : ?array {
	$query = str_replace( 'index.php?', '', $query );
	$rest_api_query = [
		'uri' => get_rest_url( null, '/wp/v2/posts' ),
		'params' => [],
	];

	// Transform `key=$matches[1]` into `key=1`
	$query = preg_replace( '#\$matches\[(\d+)\]#', '\$$1', $query );
	parse_str( $query, $parts );
	if ( ! $parts ) {
		return null;
	}

	$public_query_var_to_rest_param_map = [
		'category_name' => 'category_slug',
		'search' => 'search',
		's' => 'search',
		'paged' => 'page',
		'order' => 'order',
		'orderby' => 'orderby',
		'tag' => 'tag',
		'pagename' => 'slug',
		'attachment' => 'slug',
		'page_id' => 'id',
		'page' => '',
		//'author_name' => ''
		//'year'
	];

	foreach ( $parts as $query_var => $replacement_num ) {
		if ( isset( $public_query_var_to_rest_param_map[ $query_var ] ) ) {
			$rest_api_query['params'][ $public_query_var_to_rest_param_map[ $query_var ] ] = $replacement_num;
		} else {
			//var_dump( 'Not found for query var ', $query_var, $query );
			return null;
		}
		switch ( $query_var ) {
			case 'pagename':
			case 'page_id':
				$rest_api_query['uri'] = get_rest_url( null, '/wp/v2/pages' );
				break;
			case 'attachment':
				$rest_api_query['uri'] = get_rest_url( null, '/wp/v2/media' );
				break;
			default:
				break;
		}
	}

	return $rest_api_query;
}

/**
 * Get data for the script.
 *
 * @param string $handle Script to get data for.
 * @return array|null Data registered for the script.
 */
function get_script_data( $handle ) {
	$scripts = wp_scripts();
	$data = $scripts->get_data( $handle, 'data' );
	return $data;
}

/**
 * Get data to load into the `window` object in JS.
 *
 * @return array `window`-compatible object.
 */
function get_window_object() :array {
	list( $path ) = explode( '?', $_SERVER['REQUEST_URI'] );
	$port = $_SERVER['SERVER_PORT'];
	$port = $port !== '80' && $port !== '443' ? (int) $port : '';
	$query = $_SERVER['QUERY_STRING'];
	return [
		'document' => [],
		'location' => [
			'hash'     => '',
			'host'     => $port ? $_SERVER['HTTP_HOST'] . ':' . $port : $_SERVER['HTTP_HOST'],
			'hostname' => $_SERVER['HTTP_HOST'],
			'pathname' => $path,
			'port'     => $port,
			'protocol' => is_ssl() ? 'https:' : 'http:',
			'search'   => $query ? '?' . $query : '',
			'href'     => ( is_ssl() ? 'https://' : 'http://' ) . ( $port ? $_SERVER['HTTP_HOST'] . ':' . $port : $_SERVER['HTTP_HOST'] ) . (  $query ? '?' . $query : '' ),
		],
		'process' => [
			'env' => 'development',
		],
		'WPData' => get_init_data(),
	];
}

/**
 * Render a JS bundle into a container.
 *
 * @param string $directory Root directory to load from.
 * @param array $options {
 *     Additional options and overrides.
 *
 *     @type string $handle Script handle. Defaults to basename of the directory.
 *     @type string $container ID for the container div. "root" by default.
 *     @type boolean $async Should we load the script asynchronously on the frontend?
 * }
 */
function render( $directory, $options = [] ) {
	$entrypoint_url = get_template_directory_uri() . '/build/es/index.js';
	$entrypoint_url = 'http://localhost:8081/lib/index.js';
	// In development, don't render on the server unless enabled.
	$script = sprintf( '<script type="module" src="%s"></script>', esc_attr( $entrypoint_url ) );
	echo '<div id="root"></div>';
	echo '<script>window.HMR_WEBSOCKET_URL = "ws://localhost:8081";</script>';
	echo '<script>var WPData = ' . wp_json_encode( get_init_data() ) . '</script>';
	echo $script;
}

function server_render( $directory, $options = [] ) {
	$options = wp_parse_args( $options, [
		'handle'    => basename( $directory ),
		'container' => 'root',
		'async'     => true,
	] );
	$handle = $options['handle'];

	// Load the app source.
	$entrypoint_path = $directory . '/build/cjs/index.js';

	// Check for v8js
	if ( ! class_exists( 'V8Js' ) ) {
		trigger_error( 'react-wp-ssr requires the v8js extension, skipping server-side rendering.', E_USER_NOTICE );

		printf( '<div id="%s"></div>', esc_attr( $options['container'] ) );

		return;
	}

	// Create stubs.
	$window = wp_json_encode( get_window_object() );
	$setup = <<<END
// Set up browser-compatible APIs.
var window = this;
Object.assign( window, $window );
var console = {
	warn: print,
	error: print,
	log: ( print => it => print( JSON.stringify( it ) ) )( print )
};
window.setTimeout = window.clearTimeout = () => {};

// Expose more globals we might want.
var global = global || this,
	self = self || this;
var isSSR = true;

// Remove default top-level APIs.
delete exit;
delete sleep;
END;

	$v8 = new V8Js();

	$v8->setModuleLoader( function ( string $path ) use ( $directory ) {
		$dir = $directory . '/build/';
		$file_path = $dir . '/' . $path;
		if ( file_exists( $file_path ) ) {
			return file_get_contents( $file_path );
		}
		return '';
		throw new Exception( sprintf( 'Unable to find file at %s', esc_html( $file_path ) ) );
	} );

	/**
	 * Filter functions available to the server-side rendering.
	 *
	 * @param array $functions Map of function name => callback. Exposed on the global `PHP` object.
	 * @param string $handle Script being rendered.
	 * @param array $options Options passed to render.
	 */
	$functions = apply_filters( 'reactwpssr.functions', [], $handle, $options );
	foreach ( $functions as $name => $function ) {
		$v8->$name = $function;
	}

	$source = file_get_contents( $entrypoint_path );

	try {
		// Run the setup.
		$v8->executeString( $setup, 'ssrBootstrap' );

		// Then, execute the script.
		ob_start();
		$v8->executeString( $source, 'index.js' );
		$output = ob_get_clean();

		printf(
			'<div id="%s" data-rendered="">%s</div>',
			esc_attr( $options['container'] ),
			$output
		);
	} catch ( V8JsScriptException $e ) {
		//if ( WP_DEBUG ) {
			$offsets = [
				'header' => $header_offset,
				'data'   => $data_offset,
			];
			handle_exception( $e, './build/' . $manifest['main.js'] );
		// } else {
		// 	// Trigger a warning, but otherwise do nothing.
		// 	trigger_error( 'SSR error: '. $e->getMessage(), E_USER_WARNING );
		// }

		// Error, so render an empty container.
		printf( '<div id="%s"></div>', esc_attr( $options['container'] ) );
	}
}

/**
 * Render JS exception handler.
 *
 * @param V8JsScriptException $e Exception to handle.
 */
function handle_exception( V8JsScriptException $e ) {
	$file = $e->getJsFileName();
	$trace = explode( "\n", $e->getJsTrace() );

	// Try to get non-vendor file error
	if ( $file === 'vendor.js' && $trace ) {
		foreach ( $trace as $line ) {
			$match = preg_match( '/\((.+)\:(\d+)\:(\d+)/', $line, $matches );
			if ( ! $match || 'vendor' === $matches[1] ) {
				continue;
			}
			$file = $matches[1];
			$line = $matches[2];
			$column = $matches[3];
			$map = SourceMap::loadFromFile( dirname( __DIR__ ) . '/build/' . $file . '.map' );
			$position = $map->getPosition( $line, $column );
			if ( $position ) {
				$file = $position->source->fileName;
				$line = $position->source->line;
				$column = $position->source->column;
				$source_file = explode( "\n", $map->sources->getContents()[ array_search( $file, $map->sources->getNames() ) ] );
				$source_line = $source_file[ $line - 1 ];
			}
			break;
		}
	} else {
		$line = (int) $e->getJsLineNumber();
		$column = $e->getJsStartColumn();
		$source_line = $e->getJsSourceLine();
	}
	?>
	<style><?php echo file_get_contents( __DIR__ . '/error-overlay.css' ) ?></style>
	<div class="error-overlay"><div class="wrapper"><div class="overlay">
		<div class="header">Failed to render</div>
		<pre class="preStyle"><code class="codeStyle"><?php
			echo esc_html( $file ) . "\n";

			$trace = $e->getJsTrace();
			if ( $trace ) {
				$trace_lines = explode( "\n", $trace );
				echo esc_html( $trace_lines[0] ) . "\n\n";
			} else {
				echo $e->getMessage() . "\n\n";
			}

			// Replace tabs with tab character.
			$prefix = '> ' . $line . ' | ';
			echo $prefix . str_replace(
				"\t",
				'<span class="tab">→</span>',
				esc_html( $source_line )
			) . "\n";
			echo str_repeat( " ", strlen( $prefix ) + $column );
			echo "^";
			?></code></pre>
		<div class="footer">
			<p>This error occurred during server-side rendering and cannot be dismissed.</p>
			<?php if ( $file === 'ssrBootstrap' ): ?>
				<p>This appears to be an internal error in SSR. Please report it on GitHub.</p>
			<?php elseif ( $file === 'ssrDataInjection' ): ?>
				<p>This appears to be an error in your script's data. Check that your data is valid.</p>
			<?php endif ?>
		</div>
	</div></div></div>
	<?php
}
