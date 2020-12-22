import React, { FunctionComponent } from 'react';
import { useEffect, useState, Suspense } from 'react';
import { Helmet } from 'react-helmet';
import { getPropsForTemplate, getRequestForQuery, getTemplatesForQuery, QueryContext, get, Query, useQuery, getResolvedParams } from './lib';
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
								return <Suspense fallback={<Layout loading={ true } />}>
									<MatchedRoute {...props} regex={regex} query={query} />
								</Suspense>
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

	useOverrideExernalNavigation();

	useEffect(() => {
		window.scrollTo(0, 0);
		setLoading(true);
	}, [ props.match.url ])
	// Setup Query
	const [ loading, setLoading ] = useState(true);
	const query = { ...props.query, match: props.match.params, regex: props.regex, loading: loading, data: null, request: null };
	const request = getRequestForQuery( query );

	query.loading = true;

	// try {
		request.params = getResolvedParams( request.params );
		query.data = get( request.uri, request.params );
		query.request = request;
		query.loading = false;
	// } catch ( promise ) {
	// 	promise.then( () => {
	// 		console.log( 'done promise' );
	// 		setLoading( false );
	// 	} );
	// }
	return (
		<QueryContext.Provider value={ { ...query } }>
			<Layout loading={ query.loading }>
				<TemplateLoader />
			</Layout>
		</QueryContext.Provider>
	)
}

function TemplateLoader() {
	let templateDataProps = {}
	const query = useQuery();

	if ( query.loading ) {
		return null;
	}
	const templates = getTemplatesForQuery();
	let Comp: FunctionComponent<{}> = () => <h1>No Template</h1>
	let matchedTemplate = null;
	for (let i = 0; i < templates.length; i++) {
		const templateName = `Template${ templates[i] }`;
		if ( typeof Templates[ templateName ] === 'undefined' ) {

			continue;
		}

		matchedTemplate = templates[i]
		Comp = Templates[ templateName ];
		break;
	}

	templateDataProps = getPropsForTemplate( matchedTemplate, query );

	return <Comp {...templateDataProps}></Comp>
}

function useOverrideExernalNavigation() {
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
}

if ( isSSR ) {
	// In SSR, provider a render function rather than self-executing.
	// This is so we can create v8 snapshots that don't cause side-effects.
	window.render = () => render(() => <Page />);
} else {
	render(() => <Page />);
}
