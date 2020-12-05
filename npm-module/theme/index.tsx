import React, { FunctionComponent } from 'react';
import { useEffect, useState, useLayoutEffect } from 'react';
import { Helmet } from 'react-helmet';
import Single from '../../../Single';
import Layout from '../../../Layout';
import Archive from '../../../Archive';
import NotFound from '../../../404';
import { getPropsForQuery, getRequestForQuery, getSSR, get, getTemplatesForQuery, getCached } from './lib';
import render from './render';

import {
	BrowserRouter,
	Switch,
	Route,
	RouteComponentProps,
	useHistory,
	StaticRouter
} from "react-router-dom";

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
			<Route component={NotFound} />
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
		params: {
			[param: string]: number | boolean | string,
		},
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

const TemplateMap: { [s: string]: FunctionComponent<any> } = {
	Archive: Archive,
	Single: Single,
	NotFound: NotFound,
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

	return <Data
		{...request}
		render={ ( { loading, error, data } ) => {
			if ( loading ) {
				return <h1>Loading...</h1>;
			}
			if ( error ) {
				return <span>{ JSON.stringify( error ) }</span>
			}
			const templateDataProps = getPropsForQuery( query, data );
			const templates = getTemplatesForQuery( query, data );
			let Comp: FunctionComponent = () => <h1>No Template</h1>

			if (templates && templates[0]) {
				const template = templates[0]
				if (!TemplateMap[template]) {
					throw new Error(`Template ${template} not found: `)
				}
				Comp = TemplateMap[template];
			}

			return <Layout>
				<Comp loading={loading} error={error} {...templateDataProps}></Comp>
			</Layout>
		} }
	/>
}

function Data( props: { uri: string, params: {}, render: ( props: { loading: boolean, data: any, error: null } ) => JSX.Element } ) : JSX.Element {
	let componentProps = { loading: true, error: undefined, data: undefined };

	if ( isSSR ) {
		componentProps.data = getSSR( props.uri, props.params );
		componentProps.loading = false;
	} else if ( getCached( props.uri, props.params ) ) {
		componentProps.data = getCached( props.uri, props.params );
		componentProps.loading = false;
	} else {
		const [p, setData] = useState<typeof componentProps>(componentProps);
		componentProps = p;
		useLayoutEffect(() => {
			async function getData() {
				const response = await get( props.uri, props.params );
				setData({ loading: false, data: response, error: undefined });
			}
			getData();
		}, [])
	}
	return props.render( componentProps );
}

render(() => <Page />);
