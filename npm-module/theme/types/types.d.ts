declare const WPData: {
	rewrite: string,
	requests: {
		[url: string]: any
	}
}

declare const global: {
	print: ( string: string ) => null
}

declare const isSSR: boolean;

interface Post {
	title: {
		rendered: string,
	},
	content: {
		rendered: string,
	}
}

declare const PHP: {
	rest_request: ( string: string, params: { [param: string ] : any } ) => null,
	render: ( body: string, helmet: any ) => null,
}
