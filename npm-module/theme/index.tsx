import React, { FunctionComponent } from 'react';
import { useEffect, useState, useLayoutEffect } from 'react';
import { Helmet } from 'react-helmet';
import { getPropsForTemplate, getRequestForQuery, getSSR, get, getTemplatesForQuery, getCached } from './lib';
import render from './render';
import * as Templates from './templates';
import {
	BrowserRouter,
	Switch,
	Route,
	RouteComponentProps,
	useHistory,
	StaticRouter
} from "react-router-dom";
import Layout from '../../../Layout';

function Page() {
	const rewrite = WPData.rewrite;
	return <Router>
		<Helmet>
			<meta charSet="utf-8" />
			<title>My Theme</title>
		</Helmet>
		<Switch>
			{Object.entries(rewrite).map(([regex, query]) => {
				// Make sure start caret regex have slashes appended.
				regex = regex.replace( '^', '^/' );
				// @ts-ignore
				return <Route key={regex} path={new RegExp(regex)} render={props => {
					if ( query ) {
						return <MatchedRoute {...props} regex={regex} query={query} />
					} else {
						// Empty query means this can not be handled with front-end routing, reload.
						if ( isSSR ) {
							throw new Error( 'no-routes' );
						} else {
							window.location.href = props.match.url;
						}
					}
				} } />
			})}
		</Switch>
	</Router>;
}

function Router({ children }) {
	return isSSR ? <StaticRouter location={window.location.pathname}>
		{children}
	</StaticRouter> : <BrowserRouter>
			{children}
		</BrowserRouter>
}

interface RESTAPIParams {
	[param: string]: number | boolean | string,
};

interface MatchedRouteProps {
	query: {
		uri: string,
		params: RESTAPIParams,
	},
	regex: string,
};

export interface TemplateProps {
	loading: boolean,
	error?: {
		code: number,
		message: string,
	},
	[s: string]: any,
}

function MatchedRoute(props: MatchedRouteProps & RouteComponentProps<{ [s: string]: string }>) {
	let history = useHistory();
	useEffect(() => {
		// Make all clicks in the route use react-router
		const MakeLocal = (e: Event) => {
			let a: HTMLAnchorElement | null = null;
			if (e.target && (e.target as HTMLElement).nodeName === 'A') {
				a = (e.target as HTMLAnchorElement)
			}
			if (e.target && (e.target as HTMLElement).closest('a')) {
				a = (e.target as HTMLElement).closest('a')
			}
			if (!a) {
				return;
			}
			const url = new URL(a.href);
			history.push(url.pathname + url.search)
			e.preventDefault();
			e.stopPropagation();
		}
		document.addEventListener('click', MakeLocal)
		return () => document.removeEventListener('click', MakeLocal)
	}, []);

	const query = { ...props.query, match: props.match.params, regex: props.regex };
	const request = getRequestForQuery( query );

	const [ loading, data, error ] = useData( request.uri, request.params );

	if ( loading ) {
		return <span>loading...</span>
	}
	if ( error ) {
		return <span>{ JSON.stringify( error ) }</span>
	}

	let templateDataProps = {}
	const templates = getTemplatesForQuery( query, data );
	console.log( templates )
	let Comp: FunctionComponent = () => <h1>No Template</h1>


	for (let i = 0; i < templates.length; i++) {
		const templateName = `Template${ templates[i] }`;
		if ( typeof Templates[ templateName ] === 'undefined' ) {
			continue;
		}

		templateDataProps = getPropsForTemplate( templates[i], query, data );

		Comp = Templates[ templateName ];
		break;
	}

	return <Layout>
		<Comp loading={loading} error={error} {...templateDataProps}></Comp>
	</Layout>
}

function useData( uri: string, params: RESTAPIParams ) {
	if ( isSSR ) {
		return [ false, getSSR( uri, params ), null ];
	} else {
		const [p, setData] = useState({loading: true, data: undefined, error: null });
		useLayoutEffect(() => {
			async function getData() {
				const response = await get( uri, params );
				setData({ loading: false, data: response, error: null });
			}
			getData();
		}, [])
		return [ p.loading, p.data, p.error ];
	}
}

if ( isSSR ) {
	// In SSR, provider a render function rather than self-executing.
	// This is so we can create v8 snapshots that don't cause side-effects.
	window.render = () => render(() => <Page />);
} else {
	render(() => <Page />);
}
