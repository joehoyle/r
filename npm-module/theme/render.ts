import ReactDOM from 'react-dom';
import ReactDOMServer from 'react-dom/server';
import { Helmet } from 'react-helmet';

export const ENV_BROWSER = 'browser';
export const ENV_SERVER = 'server';
export const Head = Helmet;

// Store current script reference in case we need it later, as currentScript
// is only available on the first (synchronous) run.
let renderedScript: HTMLScriptElement | SVGScriptElement | null = null;
try {
	renderedScript = document && document.currentScript;
} catch ( err ) {
	// No-op; not defined in Node.
}

export function getEnvironment() {
	return ! isSSR ? ENV_BROWSER : ENV_SERVER;
}

export const onFrontend = ( callback: () => boolean ) => getEnvironment() === ENV_BROWSER && callback();
export const onBackend = ( callback: () => boolean ) => getEnvironment() === ENV_SERVER && callback();

export default function render( getComponent: ( environment: string ) => React.ReactElement, onClientRender?: () => {} ) {
	const environment = getEnvironment();
	const component = getComponent( environment );

	switch ( environment ) {
		case ENV_SERVER:
			const body = ReactDOMServer.renderToStaticMarkup( component );
			const helmet = Helmet.renderStatic();
			PHP.render(
				body,
				{
					meta: helmet.meta.toString(),
					bodyAttributes: helmet.bodyAttributes.toString(),
					htmlAttributes: helmet.htmlAttributes.toString(),
					link: helmet.link.toString(),
					noscript: helmet.noscript.toString(),
					script: helmet.script.toString(),
					style: helmet.style.toString(),
					title: helmet.title.toString(),
				},
			);
			break;

		case ENV_BROWSER: {
			const container = document.getElementById( 'root' );
			if ( ! container ) {
				return;
			}
			const didRender = 'rendered' in container.dataset;

			if ( didRender ) {
				ReactDOM.hydrate(
					component,
					container,
					onClientRender
				);
			} else {
				ReactDOM.render(
					component,
					container,
					onClientRender
				);
			}
			break;
		}

		default:
			throw new Error( `Unknown environment "${ environment }"` );
	}
}
