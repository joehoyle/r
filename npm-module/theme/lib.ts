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

export async function getPropsForQuery( query: Query ) {
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

	// Special case for homepage.
	if ( query.regex === '^\\/?$' ) {
		templateHierarchy = [ 'Single' ];
	}

	props.post = await get( query.uri, query.params )

	return {
		props,
		templateHierarchy,
	};
}

export async function get(uri: string, params: { [a: string]: string | number | boolean } = {}) {
	const r = await fetch( `${uri}${params && `?${encodeUri(params)}`}`);
	const json = await r.json();
	return json;
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
