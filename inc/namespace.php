<?php

namespace R;

use Exception;
use V8Js;
use V8JsScriptException;
use axy\sourcemap\SourceMap;
use WP_REST_Request;

const SSR = true;
const CSR = false;
const HMR = false;

/**
 * Main bootstrap for the plugin.
 */
function bootstrap() : void {
	// R sets a custom theme directory inside the plugin where the base
	// template exists.
	register_theme_directory( dirname( __DIR__ ) . '/theme-directory/' );

	if ( SSR ) {
		add_filter( 'do_parse_request', __NAMESPACE__ . '\\on_do_parse_request' );
	} else {
		add_action( 'template_redirect', __NAMESPACE__ . '\\render' );
	}

	add_action( 'rest_api_init', __NAMESPACE__ . '\\rest_api_init' );
}

/**
 * Add extra REST API enddpoints.
 */
function rest_api_init() : void {
	$endpoint = new REST_API\Menus_Endpoint();
	$endpoint->register_routes();
}

/**
 * Get the init data for the React app.
 *
 * User on both the server and the client side. This is attached to `window.WPData`
 *
 * @return array{ rewrite: list<array{ uri: string, params: array<string, string>}>, url: string, rest_url: string, requests: \stdClass }
 */
function get_init_data() : array {
	return [
		'rewrite' => get_rewrites(),
		'url'     => home_url( '/' ),
		'rest_url' => get_rest_url(),
		'requests' => (object) [],
	];
}

/**
 * Hook into `do_parse_request` to shortciruit the rendering.
 *
 * Hook into very early in the WordPress bootstrap to render / route
 * the React app before the "main" WP/WP_Query is done. This gives max
 * performance, as there is then no unused main WP_Query.
 */
function on_do_parse_request( bool $should_parse ) : bool {
	// Don't run on QM Persist requests
	if ( isset( $_GET['qm_id'] ) ) {
		return $should_parse ;
	}

	// Don't bother trying to route via the React app for REST requests or admin requests.
	if ( strpos( (string) $_SERVER['REQUEST_URI'], '/' . rest_get_url_prefix() ) === 0 ) {
		return $should_parse;
	}

	if ( strpos( (string) $_SERVER['REQUEST_URI'], '/wp-admin/' ) === 0 ) {
		return $should_parse;
	}

	$output = server_render();

	// Null response means the react-app should not handle this request.
	if ( $output === null ) {
		return $should_parse;
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
	// Add homepage
	if ( get_option( 'show_on_front' ) === 'page' ) {
		// Push homepage rule on to start of array
		$rest_rules = [
			'^?$' => [
				'uri' => get_rest_url( null, '/wp/v2/pages' ),
				'params' => [
					'include' => get_option( 'page_on_front' ),
				],
			],
			'wp-admin/' => null,
		] + $rest_rules;
	}

	return $rest_rules;
}

/**
 * Get a REST API query for a given rewrite rule.
 *
 * The result will stuff have placeholders in the REST request in the form of
 * `$1` etc where a value should later be substituted.
 *
 * @return ?array{ uri: string, params: array<array-key, string>}|null
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
		'name' => 'slug',
		'page_id' => 'id',
		'page' => '',
		'author_name' => 'author_slug',
		'year' => '',
		'monthnum' => '',
		'day' => '',
	];

	foreach ( $parts as $query_var => $replacement_num ) {
		/** @var string */
		$replacement_num = $replacement_num;
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
 * Get data to load into the `window` object in JS.
 *
 * @return array{ document: array, location: array{ hash: string, host: string, hostname: string, pathname: string, port: int, protocol:'http'|'https', search: string, href: string }, process: array{ env: string} } `window`-compatible object.
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
			'href'     => ( is_ssl() ? 'https://' : 'http://' ) . $_SERVER['HTTP_HOST'] . '/' . ( $query ? '?' . $query : '' ),
		],
		'process' => [
			'env' => 'development',
		],
		'WPData' => get_init_data(),
	];
}

/**
 * Render a JS bundle into a container.
 */
function render() : void {
	$render = [];
	// Add all the REST API request caches to the WPDAta
	$render['body'] = '';
	$render['style'] = get_stylesheet_directory_uri() . '/build/index.css';
	if ( has_dev_server() ) {
		$render['dev-scripts'] = true;
	} else {
		$render['script'] = get_stylesheet_directory_uri() . '/build/index.js';
	}
	$render['data'] = get_init_data();
	ob_start();
	/** @psalm-suppress all */
	include( locate_template( 'render.php' ) );
}

/**
 * Render the app on the server and output the hytrad-able app.
 */
function server_render() : ?string {
	$entrypoint_path = get_stylesheet_directory() . '/build/index.js';
	$window = get_window_object();
	$v8 = get_v8( $window, $entrypoint_path, true );
	try {
		$render = render_react_app( $v8 );
		// Add all the REST API request caches to the WPDAta
		$window['WPData']['requests'] = $render['requests_cache'];
		$render['style'] = get_stylesheet_directory_uri() . '/build/index.css';

		if ( CSR ) {
			if ( has_dev_server() ) {
				$render['dev-scripts'] = true;
			} else {
				$render['script'] = get_stylesheet_directory_uri() . '/build/index.js';
			}
			$render['data'] = $window['WPData'];
		}
		ob_start();
		include( locate_template( 'render.php' ) );
		$output = ob_get_clean();
	} catch ( V8JsScriptException $e ) {
		// Detect if no route can be handled by the React theme.
		if ( strpos( $e->getMessage(), 'no-routes' ) !== false ) {
			return null;
		}

		$offsets = [
			'header' => $header_offset,
			'data'   => $data_offset,
		];
		handle_exception( $e );
		return '';
	}

	return $output;
}

/**
 * Check if the dev server should run.
 */
function has_dev_server() : bool {
	return HMR;
}

/**
 * Get a V8 Snapshot of the entry script.
 */
function get_v8_snapshot( string $setup, string $entrypoint_path ) : ?string {
	$snapshot_version = filemtime( $entrypoint_path );
	$snapshot_path = sys_get_temp_dir() . '/' . sha1( $entrypoint_path . $snapshot_version ) . '.r-v8-snapshot';
	if ( ! file_exists( $snapshot_path ) ) {
		$source = file_get_contents( $entrypoint_path );
		/** @var string|false */
		$snapshot = V8Js::createSnapshot( $setup . $source );
		if ( ! $snapshot ) {
			trigger_error( 'Unable to create snapshot... falling back.' );
			return null;
		}
		file_put_contents( $snapshot_path, $snapshot );
	} else {
		$snapshot = file_get_contents( $snapshot_path );
	}

	return $snapshot;
}

/**
 * Get the V8 object with app loaded.
 *
 */
function get_v8( array $window_object, string $entrypoint_path, bool $use_snapshot = false ) : V8Js {
	$setup = get_bootstrap_script( $window_object );
	$v8 = null;
	if ( $use_snapshot ) {
		$snapshot = get_v8_snapshot( $setup, $entrypoint_path );
		if ( $snapshot ) {
			$v8 = new V8Js( 'PHP', [], [], true, $snapshot );
			// Add the new bootstrap data into the snapshop.
			$v8->executeString( $setup, 'bootstrap.js' );
		}
	}

	if ( ! $v8 ) {
		$v8 = new V8Js();
		$v8->setModuleLoader( function ( string $module ) : void {

		});
		$v8->executeString( $setup, 'bootstrap.js' );
		$v8->executeString( file_get_contents( $entrypoint_path ), 'index.js' );
	}

	$v8->log = function ( string $type, array $message ) : void {
		$message = array_map( function ( $message ) {
			return is_array( $message ) ? implode( ', ', $message ) : (string) $message;
		}, $message );
		// Ignore annoying react-router warning.
		if ( strpos( $message[2], 'Invalid prop `path` supplied to `Route2`.' ) !== false ) {
			return;
		}
		error_log( "SSR $type: " . implode( ", ", $message ) );
	};

	return $v8;
}

/**
 * Render the react app to HTML.
 *
 * @return array{ body: string, helmet: array, requests_cache: array<string, array> }
 */
function render_react_app( V8Js $v8 ) : array {
	$render = null;
	$request_cache = [];
	$v8->rest_request = function ( string $path, ?array $params = [] ) use ( &$request_cache ) : array {
		$relative_path = '/' . str_replace( get_rest_url(), '', $path );
		$params = (array) $params;

		$cache_path = $path . '?' . http_build_query( $params );
		/** @var array|false */
		$data = wp_cache_get( $cache_path, 'r-rest-cache' );
		if ( $data === false ) {
			$request = new WP_REST_Request( 'GET', $relative_path );
			$request->set_query_params( $params );
			$response = rest_do_request( $request );
			/** @var array */
			$data = $response->get_data();
			if ( isset( $params['_embed'] ) ) {
				/** @var array */
				$data = rest_get_server()->response_to_data( $response, $params['_embed'] );
			}
			wp_cache_set( $cache_path, $data, 'r-rest-cache' );
		}

		$request_cache[ $cache_path ] = $data;
		return $data;
	};
	$v8->render = function ( $error, string $body = '', $helmet = null ) use ( &$render ) : void {
		if ( $error ) {
			// For some reason, thrown errors in Async javscript don't trigger a PHP exception,
			// so we have to manually do it here. This means the error is not very useful, but it's
			// better than nothing.
			throw new V8JsScriptException( $error->message );
		}
		$render = [
			'body' => $body,
			'helmet' => $helmet,
		];
	};
	$v8->executeString( 'window.render()', 'renderer' );

	if ( ! $render ) {
		throw new Exception( 'No app rendered.' );
	}

	$render['requests_cache'] = $request_cache;
	return $render;
}

/**
 * Get the v8 bootstrap script.
 */
function get_bootstrap_script( array $window_object ) : string {
	$window_json = json_encode( $window_object );
	$setup = file_get_contents( __DIR__ . '/bootstrap.js' );
	$setup .= "Object.assign( window, $window_json );";
	return $setup;
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
