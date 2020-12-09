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

export function isSingle( query: Query, response: any ) : boolean {
	// Works for any post type, except attachments and pages.
	if ( ! isSingular( query, response ) ) {
		return false;
	}
	if ( query.uri.indexOf( 'wp/v2/media' ) === -1 && query.uri.indexOf( 'wp/v2/pages' ) ) {
		return true;
	}

	return false;
}

export function isSticky( query: Query, response: any ) : boolean {
	if ( ! isSingular( query, response ) ) {
		return false;
	}
	return response[0].sticky;
}

export function isArchive( query: Query, response: any ) {
	return response.length > 1;
}

export function isPage( query: Query, response: any ) {
	return isSingular( query, response ) && query.uri.match( 'wp/v2/pages' );
}

export function isPageTemplate( query: Query, response: any, template: string ) {
	// Todo
}

export function isCategory( query: Query, response: any ) {
	return query.params.category || query.params.category_slug;
}

export function isTag( query: Query, response: any ) {
	return query.params.tag || query.params.tag_slug;
}

export function isTax( query: Query, response: any ) {
	// Todo
}

export function isAuthor( query: Query, response: any ) {
	return query.params.author_slug || query.params.author;
}

export function isSearch( query: Query, response: any ) {
	return !! query.params.search;
}

export function is404( query: Query, response: any ) {
	return response.length === 0;
}

export function isAttachment( query: Query, response: any ) {
	return isSingular( query, response ) && query.uri.match( 'wp/v2/media' );
}

export function isSingular( query: Query, response: any ) {
	return ( query.params.slug || query.params.id ) && response.length === 1;
}

export function isPreview( query: Query, response: any ) {

}

export function getTemplatesForQuery( query: Query, response: any ) {
	if ( ! response ) {

	}
	let templateHierarchy: string[] = [ 'NotFound' ];
	// Special case for homepage.
	if ( query.regex === '^\/?$' && query.uri.indexOf( 'wp/v2/pages' ) > -1 ) {
		templateHierarchy = [ 'FrontPage', 'Page', 'Index' ];
	}

	// All post endpoints:
	if ( query.uri.indexOf( 'wp/v2/posts' ) ) {
		if ( isSingular( query, response ) ) {
			templateHierarchy = [ `SinglePost-${ response[0].slug }`, 'SinglePost', 'Single', 'Singular', 'Index' ];
		} else if ( isCategory( query, response ) ) {
			// Todo: load category, Cateogry-$id
			templateHierarchy = [ `Category-${ query.params.category_slug }`, 'Category', 'Archive', 'Index' ];
		} else if ( isTag( query, response ) ) {
			// Todo: load tag, Tag-$id
			templateHierarchy = [ `Tag-${ query.params.category_slug }`, 'Tag', 'Archive', 'Index' ];
		} else if ( isAuthor( query, response ) ) {
			// Todo: load autohor, Author-$nicename, Author-$id
			templateHierarchy = [ 'Author', 'Archive', 'Index' ];
		} else if ( isSearch( query, response ) ) {
			// Todo: load autohor, Author-$nicename, Author-$id
			templateHierarchy = [ 'Search', 'Index' ];
		}

		// Todo: Date archives

		// Todo: custom taxs
	}

	// Todo: CPTs
	if ( isAttachment( query, response ) ) {
		const media = response[0];
		templateHierarchy = [ toCamelCase( media.mime_type ), 'Attachment', `SingleAttachment-${ media.slug}`, 'SingleAttachment', 'Singular', 'Index' ];
	}

	// Todo: embeds

	if ( isPage( query, response ) ) {
		// Todo: page template
		templateHierarchy = [ `Page-${ response[0].slug }`, `Page-${ response[0].id }`, 'Page', 'Singular', 'Index' ];
	}

	return templateHierarchy;
}

function toCamelCase( str ) {
	return str.replace(
		/[^a-z0-9]*([a-z0-9])([a-z0-9]*)/ig,
		(m, u, l) => u.toUpperCase() + l.toLowerCase()
	);
}

export function getPropsForTemplate( template: string, query: Query, response: any ) {
	switch ( template ) {
		case 'Single':
		case 'Singular':
		case 'SinglePost':
			return { post: response[0] };
		case 'Attachment':
			return { attachment: response[0] };
		case 'Page':
		case 'FrontPage':
			return { page: response[0] };
		case 'Category':
			return {
				posts: response,
				//category: get( '/wp/v2/categories', { slug: query.params.category_slug } ),
			};
		case 'Tag':
			return {
				posts: response,
				//tag: get( '/wp/v2/tags', { slug: query.params.tag_slug } ),
			};
		case 'Author':
			return {
				posts: response,
				//author: get( '/wp/v2/users', { slug: query.params.author_slug } ),
			};
		case 'Search':
			return { posts: response, search: query.params.search };
		case 'Index':
		case 'Archive':
			return { posts: response };
	}
}


export async function get(uri: string, params: { [a: string]: string | number | boolean } = {}) : Promise<any> {
	if ( isSSR ) {
		const body = PHP.rest_request( uri, params );
		return body;
	} else {
		// Check the preload cache first
		const url = `${uri}?${encodeUri(params)}`;
		if ( WPData.requests[ url ] ) {
			return WPData.requests[ url ]
		}

		const r = await fetch( url )
		const json = await r.json();
		return json;
	}
}

window.get = get

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
