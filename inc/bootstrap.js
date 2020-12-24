// Set up browser-compatible APIs.
var window = this;
function serverLog( type, ...args ) {
	args = args.map( arg => {
		if ( typeof arg === 'object' ) {
			return JSON.stringify( arg, null, 4 );
		}
		const val = String( arg );
		return val;
	} );
	if ( typeof PHP !== 'undefined' && typeof PHP.log !== 'undefined' ) {
		PHP.log( type, args );
	}
}

var console = {
	warn: ( ...args ) => serverLog( 'warn', ...args ),
	error: ( ...args ) => serverLog( 'error', ...args ),
	log: ( ...args ) => serverLog( 'log', ...args ),
};
window.setTimeout = window.clearTimeout = () => {};

// Expose more globals we might want.
var global = this,
	self = this;
var isSSR = true;

// Remove default top-level APIs.l;-po
delete exit;
delete sleep;
delete var_dump;
