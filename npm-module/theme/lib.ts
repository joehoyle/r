interface Query {
	uri: string,
	params: {
		[param: string]: number | boolean | string,
	},
	match: {
		[param: string]: string,
	},
	regex: string,
}

export function getRequestForQuery( query: Query ) {
	for ( const param in query.params ) {
		const value = query.params[ param ];
		if ( typeof value !== 'string' || value.indexOf( '$' ) !== 0 ) {
			continue;
		}
		const paramNumber = Number( value.replace( '$', '' ) );

		// Param replacements are 1-based, but match positions are zero-based.
		query.params[ param ] = query.match[ paramNumber - 1 ];
	}

	return {
		uri: query.uri,
		params: query.params
	}
}

export function getTemplatesForQuery( query: Query, response: any ) {
	let templateHierarchy: string[] = [ 'NotFound' ];
	// Special case for homepage.
	//if ( query.regex === '^\/?$' ) {
		templateHierarchy = [ 'Single' ];
	//}

	return templateHierarchy;
}

export function getPropsForQuery( query: Query, response: any ) {
	const templates = getTemplatesForQuery( query, response );
	if ( isSingular( query ) ) {
		if ( Array.isArray( response ) ) {
			response = response[0];
		}
	}
	return {
		post: response,
	}
}

export function isSingular( query: Query ) {
	if ( query.params.slug || query.params.id ) {
		return true;
	}

	return false;
}

export async function get(uri: string, params: { [a: string]: string | number | boolean } = {}) {
	if ( isSSR ) {
		const body = PHP.rest_request( uri, params );
		return Promise.resolve( body )
	} else {
		// Check the preload cache first
		const url = `${uri}?${encodeUri(params)}`;
		if ( WPData.requests[ url ] ) {
			return Promise.resolve( WPData.requests[ url ] )
		}
		const r = await fetch( url );
		const json = await r.json();
		return json;
	}
}

export function getCached(uri: string, params: { [a: string]: string | number | boolean } = {}) {
	// Check the preload cache first
	const url = `${uri}?${encodeUri(params)}`;
	if ( WPData.requests[ url ] ) {
		return WPData.requests[ url ]
	}

	return null;
}

export function getSSR(uri: string, params: { [a: string]: string | number | boolean } = {}) : any {
	const body = PHP.rest_request( uri, params );
	return body
}

function encodeUri(obj: { [a: string]: string | number | boolean }) {
	var str = '';
	for (var key in obj) {
		if (str != '') {
			str += '&';
		}
		str += key + '=' + encodeURIComponent(obj[key]);
	}
	return str;
}
