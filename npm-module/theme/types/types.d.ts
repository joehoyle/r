declare const WPData: {
	rewrite: {
		[regex: string]: null|{
			uri: string,
			params: {
				[param: string]: string,
			}
		}
	},
	requests: {
		[url: string]: any
	},
	rest_url: string,
	url: string,
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

interface MenuItem {
	id: number,
	order: number,
	parent: number,
	title: string,
	url: string,
	attr: string,
	target: string,
	classes: string,
	xfn: string,
	description: string,
	object_id: number,
	object_slug: string,
	type: string,
	type_label: string,
	children?: MenuItem[],
}

declare const PHP: {
	rest_request: ( string: string, params: { [param: string ] : any } ) => null,
	render: ( body: string, helmet: any ) => null,
}
