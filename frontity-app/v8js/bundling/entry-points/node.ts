import './url';
import './fetch';
import server from "@frontity/core/src/server";
import frontity__mars_theme_default from "@frontity/mars-theme/src/index";
import frontity__wp_source_default from "@frontity/wp-source/src/index";
import frontity__tiny_router_default from "@frontity/tiny-router/src/index";
import frontity__html2react_default from "@frontity/html2react/src/index";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FilledContext } from "react-helmet-async";

import getTemplate from "../../../node_modules/@frontity/core/src/server/templates";
import getSettings from "./getSettings";
import getHeadTags from "../../../node_modules/@frontity/core/src/server/utils/head";
import App from "../../../node_modules/@frontity/core/src/app";
import { FrontityTags } from "../../../node_modules/@frontity/core/types";
import createStore from "../../../node_modules/@frontity/core/src/server/store";

const packages = {
	frontity__mars_theme_default,
	frontity__wp_source_default,
	frontity__tiny_router_default,
	frontity__html2react_default,
};

window.render = async () => {
	// Get settings.server-bundle.js:3385:101
	const ctx = {
		href: window.location.href,
		url: new URL(window.location.href)
	}
	const settings = await getSettings({
		url: ctx.href,
		name: 'My Site',
	});

	// Get the correct template or html if none is found.
	const template = getTemplate({ mode: settings.mode });

	// Init variables.
	let html = "";
	const frontity: FrontityTags = {};

	// Create the store.
	const store = createStore({ settings, packages, url: ctx.url });

	// Run init actions.
	await Promise.all(
		Object.values(store.actions).map(({ init }) => {
			if (init) return init();
		})
	);

	// Run beforeSSR actions.
	await Promise.all(
		Object.values(store.actions).map(({ beforeSSR }) => {
			if (beforeSSR) return beforeSSR({ ctx });
		})
	);

	// Pass a context to HelmetProvider which will hold our state specific to
	// each request.
	const helmetContext = {} as FilledContext;

	const Component = <App store={store} helmetContext={helmetContext} />;

	html = renderToStaticMarkup(Component);

	// Run afterSSR actions.
	Object.values(store.actions).forEach(({ afterSSR }) => {
		if (afterSSR) afterSSR();
	});

		// Get static head strings.
		const head = getHeadTags(helmetContext.helmet);

		// Write the template to body.
	const body = template({ html, frontity, head });

	PHP.render( body );
}
