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
	let props: { [a: string]: any } = {};

	let templateHierarchy: string[] = [ 'NotFound' ];

	for ( const param in query.params ) {
		const value = query.params[ param ];
		if ( typeof value !== 'string' || value.indexOf( '$' ) !== 0 ) {
			continue;
		}
		const paramNumber = Number( value.replace( '$', '' ) );

		query.params[ param ] = query.match[ paramNumber ];
	}

	return {
		uri: query.uri,
		params: query.params
	}
}

export function getTemplatesForQuery( query: Query, response: any ) {
	let props: { [a: string]: any } = {};

	let templateHierarchy: string[] = [ 'NotFound' ];
	// Special case for homepage.
	if ( query.regex === '^\/?$' ) {
		templateHierarchy = [ 'Single' ];
	}

	return templateHierarchy;
}

export function getPropsForQuery( query: Query, response: any ) {
	const templates = getTemplatesForQuery( query, response );
	return response;
}


export async function get(uri: string, params: { [a: string]: string | number | boolean } = {}) {
	if ( isSSR ) {
		const body = PHP.rest_request( uri, params );
		return Promise.resolve( body )
	} else {
		const r = await fetch( `${uri}${params && `?${encodeUri(params)}`}`);
		const json = await r.json();
		return json;
	}
}

export function getSSR(uri: string, params: { [a: string]: string | number | boolean } = {}) {
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
