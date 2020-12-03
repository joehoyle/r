import React, { FunctionComponent } from 'react';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import Single from '../../../Single';
import Layout from '../../../Layout';
import Archive from '../../../Archive';
import NotFound from '../../../404';
import { getPropsForQuery } from './lib';
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
		</Helmet>
		<Switch>
			{Object.entries( rewrite ).map( ( [ regex, query ] ) => (
				// @ts-ignore
				<Route key={regex} path={new RegExp(regex)} render={props => <MatchedRoute {...props} regex={ regex } query={ query } />} />
			))}
			<Route component={ NotFound } />
		</Switch>
	</Router>;
}

function Router( { children } ) {
	return isSSR ? <StaticRouter location={ window.location.href }>
		{ children }
	</StaticRouter> : <BrowserRouter>
		{ children }
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
	templateHierarchy?: string[],
	[s: string]: any,
}

const TemplateMap: { [s: string]: FunctionComponent<any> } = {
	Archive: Archive,
	Single: Single,
	NotFound: NotFound,
}

function MatchedRoute(props: MatchedRouteProps & RouteComponentProps<{ [s: string ]: string }>) {
	let history = useHistory();
	useEffect( () => {
		// Make all clicks in the route use react-router
		const MakeLocal = ( e: Event ) => {
			let a: HTMLAnchorElement|null = null;
			if ( e.target && (e.target as HTMLElement).nodeName === 'A' ) {
				a = (e.target as HTMLAnchorElement)
			}
			if ( e.target && (e.target as HTMLElement).closest( 'a' ) ) {
				a = (e.target as HTMLElement).closest( 'a' )
			}
			if ( ! a ) {
				return;
			}
			const url = new URL( a.href );
			history.push( url.pathname + url.search )
			e.preventDefault();
			e.stopPropagation();
		}
		document.addEventListener( 'click', MakeLocal )
		return () => document.removeEventListener( 'click', MakeLocal )
	}, [] );


	const [data, setData] = useState<TemplateProps>({ loading: true });
	useEffect(() => {
		async function getData() {
			const data = await getPropsForQuery( { ...props.query, match: props.match.params, regex: props.regex } );
			setData({ props: data.props, templateHierarchy: data.templateHierarchy, loading: false, error: undefined });
		}
		getData();
	}, [])

	let Comp: FunctionComponent = () => <h1>Loading...</h1>;
	// If there's an error, or no data found (empty list), show a 404
	if ( ( ! data.loading && data.error ) || ( ! data.loading && Array.isArray( data.data ) && data.data.length === 0 ) ) {
		Comp = NotFound;
	}

	if ( data.templateHierarchy && data.templateHierarchy[0] ) {
		const template = data.templateHierarchy[0]
		if ( ! TemplateMap[ template ] ) {
			throw new Error( `Template ${ template } not found: `)
		}
		Comp = TemplateMap[ data.templateHierarchy[0] ];
	}

	return <Layout>
		<Comp loading={ data.loading } error={ data.error } {...data.props } />
	</Layout>
}

render( () => <Page /> );
