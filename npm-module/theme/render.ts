import ReactDOM from 'react-dom';
import ReactDOMServer from 'react-dom/server';

export const ENV_BROWSER = 'browser';
export const ENV_SERVER = 'server';

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
			global && global.print( ReactDOMServer.renderToStaticMarkup( component ) );
			break;

		case ENV_BROWSER: {
			const container = renderedScript && renderedScript.dataset.container && document.getElementById( renderedScript.dataset.container );
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
			throw new Error( `Unknown environment \"${ environment }\"` );
	}
}
