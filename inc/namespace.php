<?php

namespace R;

use Exception;
use V8Js;
use V8JsScriptException;
use axy\sourcemap\SourceMap;
use WP_REST_Request;

const SSR = false;

function bootstrap() : void {
	register_theme_directory( dirname( __DIR__ ) . '/theme-directory/' );
	if ( SSR ) {
		add_action( 'wp_loaded', __NAMESPACE__ . '\\on_wp_loaded' );
	} else {
		add_action( 'template_redirect', __NAMESPACE__ . '\\render' );

	}
}

function get_init_data() : array {
	return [
		'rewrite' => get_rewrites(),
		'url'     => home_url( '/' ),
		'requests' => (object) [],
	];
}

function on_wp_loaded() : void {
	$output = server_render();
	// Null response means the react-app should not handle this request.
	if ( $output === null ) {
		return;
	}

	echo $output;
	exit;
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
	// $rest_rules = array_filter( $rest_rules );
	// Add homepage
	if ( get_option( 'show_on_front' ) === 'page' ) {
		// Push homepage rule on to start of array
		$rest_rules = [
			'^/?$' => [
				'uri' => get_rest_url( null, '/wp/v2/pages/' . get_option( 'page_on_front' ) ),
				'params' => [],
			],
			'wp-admin/' => null,
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
			// Can be empty string, which means allowed by ignored.
			if ( $public_query_var_to_rest_param_map[ $query_var ] ) {
				$rest_api_query['params'][ $public_query_var_to_rest_param_map[ $query_var ] ] = $replacement_num;
			}
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
function get_window_object() : array {
	list( $path ) = explode( '?', $_SERVER['REQUEST_URI'] );
	$port = $_SERVER['SERVER_PORT'];
	$query = $_SERVER['QUERY_STRING'];
	return [
		'document' => [],
		'location' => [
			'hash'     => '',
			'host'     => $_SERVER['HTTP_HOST'],
			'hostname' => $_SERVER['HTTP_HOST'],
			'pathname' => $path,
			'port'     => 80,
			'protocol' => is_ssl() ? 'https:' : 'http:',
			'search'   => $query ? '?' . $query : '',
			'href'     => ( is_ssl() ? 'https://' : 'http://' ) . $_SERVER['HTTP_HOST'] . '/' . (  $query ? '?' . $query : '' ),
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
function render() : void {
	$render = [];
	// Add all the REST API request caches to the WPDAta
	$render['body'] = '<div id="root"></div>';
	$render['style'] = get_stylesheet_directory_uri() . '/build/index.css';
	$render['script'] = get_stylesheet_directory_uri() . '/build/index.js';
	$render['data'] = get_init_data();
	ob_start();
	include( locate_template( 'index.php' ) );
}

function server_render() : ?string {

	// Load the app source.
	$entrypoint_path = get_stylesheet_directory_uri() . '/build/index.js';

	// Create stubs.
	$window = get_window_object();
	$window_json = json_encode( $window );
	$setup = <<<END
// Set up browser-compatible APIs.
var window = this;
Object.assign( window, $window_json );
var console = {
	warn: PHP.log,
	error: PHP.log,
	log: ( print => it => print( JSON.stringify( it, null, 4 ) + "\\n" ) )( PHP.log )
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

	// TODO: Snapshot support

	$v8 = new V8Js();
	$directory = get_stylesheet_directory();
	$request_cache = [];

	$v8->rest_request = function ( string $path, $params ) use ( &$request_cache ) {
		$relative_path = '/' . str_replace( get_rest_url(), '', $path );
		$params = (array) $params;
		$cache_path = $path . '?' . http_build_query( $params );
		$request = new WP_REST_Request( 'GET', $relative_path );
		$request->set_query_params( $params );
		$response = rest_do_request( $request );
		$data = $response->get_data();
		$request_cache[ $cache_path ] = $data;
		return $data;
	};
	$v8->setModuleLoader( function ( string $path ) use ( $directory ) {
		$dir = $directory . '/build';
		$file_path = $dir . '/' . $path;
		if ( file_exists( $file_path ) ) {
			return file_get_contents( $file_path );
		}
		return '';
		throw new Exception( sprintf( 'Unable to find file at %s', esc_html( $file_path ) ) );
	} );
	$render = null;
	$v8->render = function ( string $body, $helmet ) use ( &$render ) {
		$render = [
			'body' => $body,
			'helmet' => $helmet,
		];
	};

	$v8->log = function ( string $message ) {
		error_log( $message );
	};

	$source = file_get_contents( $entrypoint_path );

	try {
		// Run the setup.
		$v8->executeString( $setup, 'ssrBootstrap' );

		// Then, execute the script.
		ob_start();
		$v8->executeString( $source, 'index.js' );
		$output = ob_get_clean();

		if ( ! $render ) {
			return 'No app was rendered.';
		}

		// Add all the REST API request caches to the WPDAta
		$window['WPData']['requests'] = $request_cache;

		$render['style'] = get_stylesheet_directory_uri() . '/build/index.css';
		$render['script'] = get_stylesheet_directory_uri() . '/build/index.js';
		$render['data'] = $window['WPData'];
		ob_start();
		include( locate_template( 'index.php' ) );
		$output = ob_get_clean();
	} catch ( V8JsScriptException $e ) {
		// Detect if no route can be handled by the React theme.
		if ( strpos( $e->getMessage(), 'no-routes' ) ) {
			return null;
		}
		exit;
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
		return '';
	}

	return $output;
}

/**
 * Render JS exception handler.
 *
 * @param V8JsScriptException $e Exception to handle.
 */
function handle_exception( V8JsScriptException $e ) : void {
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
			$map_file = dirname( __DIR__ ) . '/build/' . $file . '.map';
			if ( ! file_exists( $map_file ) ) {
				break;
			}
			$map = SourceMap::loadFromFile( $map_file );

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
	}

	if ( ! $line ) {
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
