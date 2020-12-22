import React, { useContext, useState, useLayoutEffect, ReactElement, FunctionComponent } from 'react';

export const QueryContext = React.createContext( { loading: true } );

export interface Query {
	uri: string,
	params: QueryParams,
	request?: {
		uri: string,
		params: {
			[param: string]: number | boolean | string,
		},
	}
	match: {
		[param: string]: string,
	},
	regex: string,
	loading: boolean,
	data?: any[],
	error?: any,
}

interface QueryParams {
	[param: string]: number | boolean | string,
}

interface RESTAPIParams {
	[param: string]: number | boolean | string,
};

// Todo: needs to be async, map things like category_slug
export function getRequestForQuery( query: Query ) {
	let params = {};
	for ( const param in query.params ) {
		const value = query.params[ param ];
		if ( typeof value !== 'string' || value.indexOf( '$' ) !== 0 ) {
			params[ param ] = value;
			continue;
		}
		const paramNumber = Number( value.replace( '$', '' ) );

		// Param replacements are 1-based, but match positions are zero-based.
		params[ param ] = query.match[ paramNumber - 1 ];
	}

	return {
		uri: query.uri,
		params,
	}
}

/**
 * Transforms a map of query params for query vars that may not
 * directly be able to be passed to the rest api, and returns
 * resolved params. E.g. category_slug=abc => category => 123
 */
export function getResolvedParams( params: QueryParams ) {
	const newParams: QueryParams = {};
	let anyLoading = false;
	let anyError = null;
	for ( const param in params ) {
		let loading, object, error, to;
		switch ( param ) {
			case 'category_slug':
				newParams.categories = get( `/wp/v2/categories?slug=${ params[ param ] }` )[0].id;
				break;
			case 'author_slug':
				newParams.author = get( `/wp/v2/users?slug=${ params[ param ] }` )[0].id;
			default:
				newParams[ param ] = params[ param ];
		}
	}

	return newParams;
}

export function useQuery() : Query {
	return useContext<Query>( QueryContext );
}

export function isSingle() : boolean {
	const query = useQuery();
	// Works for any post type, except attachments and pages.
	if ( ! isSingular() ) {
		return false;
	}
	if ( query.uri.indexOf( 'wp/v2/media' ) === -1 && query.uri.indexOf( 'wp/v2/pages' ) ) {
		return true;
	}

	return false;
}

export function isLoading() : boolean {
	const query = useQuery();
	return query.loading;
}

export function isSticky() : boolean {
	const query = useQuery();
	if ( ! isSingular() ) {
		return false;
	}
	return query.data[0]?.sticky;
}

export function isArchive() {
	const query = useQuery();
	return query.data.length > 1;
}

export function isPage() {
	const query = useQuery();
	return isSingular() && query.uri.match( 'wp/v2/pages' );
}

export function isPageTemplate( template: string ) {
	// Todo
	const query = useQuery();
}

export function isCategory() {
	const query = useQuery();
	return query.params.category || query.params.category_slug;
}

export function isTag() {
	const query = useQuery();
	return query.params.tag || query.params.tag_slug;
}

export function isTax() {
	// Todo
}

export function isAuthor() {
	const query = useQuery();
	return query.params.author_slug || query.params.author;
}

export function isSearch() {
	const query = useQuery();
	return !! query.params.search;
}

export function is404() {
	const query = useQuery();
	return query.data?.length === 0;
}

export function isAttachment() {
	const query = useQuery();
	return isSingular() && query.uri.match( 'wp/v2/media' );
}

export function isSingular() {
	const query = useQuery();
	return ( query.params.slug || query.params.id ) && query.data?.length === 1;
}

export function isPreview( query: Query, response: any ) {

}

export function getTemplatesForQuery() {
	const query = useQuery();

	let templateHierarchy: string[] = [ 'NotFound' ];
	// Special case for homepage.
	if ( query.regex === '^\/?$' && query.uri.indexOf( 'wp/v2/pages' ) > -1 ) {
		templateHierarchy = [ 'FrontPage', 'Page', 'Index' ];
	}

	// All post endpoints:
	if ( query.uri.indexOf( 'wp/v2/posts' ) ) {
		if ( isSingular() ) {
			templateHierarchy = [ `SinglePost-${ query.data[0].slug }`, 'SinglePost', 'Single', 'Singular', 'Index' ];
		} else if ( isCategory() ) {
			// Todo: load category, Cateogry-$id
			templateHierarchy = [ `Category-${ query.params.category_slug }`, 'Category', 'Archive', 'Index' ];
		} else if ( isTag() ) {
			// Todo: load tag, Tag-$id
			templateHierarchy = [ `Tag-${ query.params.tag_slug }`, 'Tag', 'Archive', 'Index' ];
		} else if ( isAuthor() ) {
			// Todo: load autohor, Author-$nicename, Author-$id
			templateHierarchy = [ 'Author', 'Archive', 'Index' ];
		} else if ( isSearch() ) {
			// Todo: load autohor, Author-$nicename, Author-$id
			templateHierarchy = [ 'Search', 'Index' ];
		}

		// Todo: Date archives

		// Todo: custom taxs
	}

	// Todo: CPTs
	if ( isAttachment() ) {
		const media = query.data[0];
		templateHierarchy = [ toCamelCase( media.mime_type ), 'Attachment', `SingleAttachment-${ media.slug}`, 'SingleAttachment', 'Singular', 'Index' ];
	}

	// Todo: embeds

	if ( isPage() ) {
		// Todo: page template
		templateHierarchy = [ `Page-${ query.data[0].slug }`, `Page-${ query.data[0].id }`, 'Page', 'Singular', 'Index' ];
	}

	return templateHierarchy;
}

function toCamelCase( str ) {
	return str.replace(
		/[^a-z0-9]*([a-z0-9])([a-z0-9]*)/ig,
		(m, u, l) => u.toUpperCase() + l.toLowerCase()
	);
}

export function getPropsForTemplate( template: string, query: Query ) {
	switch ( template ) {
		case 'Single':
		case 'Singular':
		case 'SinglePost':
			return { post: query.data[0] };
		case 'Attachment':
			return { attachment: query.data[0] };
		case 'Page':
		case 'FrontPage':
			return { page: query.data[0] };
		case 'Category':
			return {
				posts: query.data,
				category: get( `/wp/v2/categories/${ query.request.params.categories }` ),
			};
		case 'Tag':
			return {
				posts: query.data,
				tag: get( '/wp/v2/tags', { slug: query.params.tag_slug } )[0],
			};
		case 'Author':
			return {
				posts: query.data,
				author: get( `/wp/v2/users/${ query.request.params.author }` ),
			};
		case 'Search':
			return { posts: query.data, search: query.params.search };
		case 'Index':
		case 'Archive':
			return { posts: query.data };
	}
}

const inflightRequests = {};

export function get(uri: string, params?: { [a: string]: string | number | boolean } = {}) : any {
	if ( uri.startsWith( '/' ) ) {
		uri = WPData.rest_url + uri.substr( 1 );
	}
	// parse url params
	params = { ...params }
	if ( uri.indexOf( '?' ) > -1 ) {
		let querystring = '';
		[ uri, querystring ] = uri.split( '?' );
		const query = querystring.split( '&' ).map( p => p.split( '=' ) );
		query.forEach( q => {
			params[ decodeURIComponent( q[0] ) ] = decodeURIComponent( q[1] );
		} );
	}
	if ( isSSR ) {
		const body = PHP.rest_request( uri, params );
		return body;
	} else {
		// Check the preload cache first
		const url = `${uri}?${encodeUri(params)}`;
		if ( WPData.requests[ url ] ) {
			return WPData.requests[ url ]
		}

		if ( inflightRequests[ url ] ) {
			throw inflightRequests[ url ];
		}
		const r = fetch( url ).then( r => r.json() ).then( data => {
			delete inflightRequests[ url ];
			WPData.requests[ url ] = data;
			return data;
		})

		inflightRequests[ url ] = r;

		throw r;

		// const r = await fetch( url )
		// const json = await r.json();

		// WPData.requests[ url ] = json;
		// return json;
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

export const Image: FunctionComponent<{id: number, size: string, className?: string}> = ({ id, className, size }) => {
	const image = get( `/wp/v2/media/${ id }` );

	return <img
		src={ image.media_details?.sizes?.large?.source_url }
		className={ className }
	/>
}

type MenuProps = {
	location: string,
	renderItem?: ( item: MenuItem ) => ReactElement,
	className?: string,
}


export const Menu: FunctionComponent<MenuProps> = ({ location, renderItem, className }) => {
	const items = get<MenuItem[]>( `/r/v1/menu-locations/${ location }` );
	const defaultRenderItem = ( item: MenuItem ) => (
		<li key={ item.ID }>
			<a href={ item.url }>{ item.title }</a>
		</li>
	);

	return (
		<ul className={ className }>
			{ items.map( renderItem || defaultRenderItem ) }
		</ul>
	)
}
