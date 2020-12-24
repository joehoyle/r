type FetchResult = {
	json: () => Promise<any>,
	text: () => Promise<string>
}

interface Response {
	headers: {
		[key: string]: string;
	};
	body: string;
	response: {
		code: Number;
		message: string;
	};
}

interface RequestOptions {
	body?: string;
	headers?: {
		[key: string]: string;
	};
}

function fetchPolyfill( url: string, args?: RequestOptions ) : Promise<FetchResult> {
	return new Promise( function ( resolve, reject ) {
		let result: Response;
		try {
			result = PHP.rest_request(url, args ) as Response;
		} catch ( e ) {
			throw new Error( e.getMessage() )
		}
		const response = {
			json: () : Promise<any> => {
				return new Promise( function( resolve, reject ) {
					resolve( result.body );
				} );
			},
			text: () : Promise<string> => {
				return new Promise( function( resolve, reject ) {
					resolve( JSON.stringify(result.body) );
				} );
			},
			headers: {
				get( header: string ) : string|undefined {
					return result.headers[ header ]
				}
			},
			ok: result.response.code < 300,
		}
		resolve( response );
	} );
}


export default window.fetch ? window.fetch.bind(window) : fetchPolyfill;
// export const fetch = window.fetch.bind(window);

export const fetch = window.fetch ? window.fetch.bind(window) : fetchPolyfill;

if ( ! global.fetch ) {
	global.fetch = fetchPolyfill;
}
