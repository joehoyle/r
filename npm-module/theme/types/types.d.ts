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

/**
 * A post object in a REST API context.
 */
interface Post {
	/**
	 * The date the object was published, in the site's timezone.
	 */
	date: string | null;
	/**
	 * The date the object was published, as GMT.
	 */
	date_gmt: string | null;
	/**
	 * The globally unique identifier for the object.
	 */
	guid: {
	  /**
	   * GUID for the object, as it exists in the database. Only present when using the 'edit' context.
	   */
	  raw?: string;
	  /**
	   * GUID for the object, transformed for display.
	   */
	  rendered: string;
	};
	/**
	 * Unique identifier for the object.
	 */
	id: number;
	/**
	 * URL to the object.
	 */
	link: string;
	/**
	 * The date the object was last modified, in the site's timezone.
	 */
	modified: string;
	/**
	 * The date the object was last modified, as GMT.
	 */
	modified_gmt: string;
	/**
	 * An alphanumeric identifier for the object unique to its type.
	 */
	slug: string;
	/**
	 * A named status for the object.
	 */
	status: string;
	/**
	 * Type of Post for the object.
	 */
	type: string;
	/**
	 * A password to protect access to the content and excerpt. Only present when using the 'edit' context.
	 */
	password?: string;
	/**
	 * Permalink template for the object. Only present when using the 'edit' context and the post type is public.
	 */
	permalink_template?: string;
	/**
	 * Slug automatically generated from the object title. Only present when using the 'edit' context and the post type is public.
	 */
	generated_slug?: string;
	/**
	 * The ID for the parent of the object. Only present for hierarchical post types.
	 */
	parent?: number;
	/**
	 * The title for the object.
	 */
	title: {
	  /**
	   * Title for the object, as it exists in the database. Only present when using the 'edit' context.
	   */
	  raw?: string;
	  /**
	   * HTML title for the object, transformed for display.
	   */
	  rendered: string;
	};
	/**
	 * The content for the object.
	 */
	content: {
	  /**
	   * Content for the object, as it exists in the database. Only present when using the 'edit' context.
	   */
	  raw?: string;
	  /**
	   * HTML content for the object, transformed for display.
	   */
	  rendered: string;
	  /**
	   * Version of the content block format used by the object. Only present when using the 'edit' context.
	   */
	  block_version?: number;
	  /**
	   * Whether the content is protected with a password.
	   */
	  protected: boolean;
	};
	/**
	 * The ID for the author of the object.
	 */
	author: number;
	/**
	 * The excerpt for the object.
	 */
	excerpt: {
	  /**
	   * Excerpt for the object, as it exists in the database. Only present when using the 'edit' context.
	   */
	  raw?: string;
	  /**
	   * HTML excerpt for the object, transformed for display.
	   */
	  rendered: string;
	  /**
	   * Whether the excerpt is protected with a password.
	   */
	  protected: boolean;
	};
	/**
	 * The ID of the featured media for the object.
	 */
	featured_media?: number;
	/**
	 * Whether or not comments are open on the object.
	 */
	comment_status: string;
	/**
	 * Whether or not the object can be pinged.
	 */
	ping_status: string;
	/**
	 * The format for the object.
	 */
	format?: string;
	/**
	 * Meta fields.
	 */
	meta:
	  | []
	  | {
		  [k: string]: unknown;
		};
	/**
	 * Whether or not the object should be treated as sticky. Only present for the 'post' post type.
	 */
	sticky?: boolean;
	/**
	 * The theme file to use to display the object.
	 */
	template?: string;
	/**
	 * The terms assigned to the object in the category taxonomy. Only present for post types that support categories.
	 */
	categories?: number[];
	/**
	 * The terms assigned to the object in the post_tag taxonomy. Only present for post types that support tags.
	 */
	tags?: number[];
	/**
	 * The embedded representation of relations. Only present when the '_embed' query parameter is set.
	 */
	_embedded?: {
	  /**
	   * The author of the post.
	   */
	  author: unknown[];
	  /**
	   * The replies to the post (comments, pingbacks, trackbacks).
	   */
	  replies?: unknown[][];
	  /**
	   * The taxonomy terms for the post.
	   */
	  "wp:term"?: unknown[];
	  /**
	   * The parent post.
	   */
	  up?: unknown[];
	  [k: string]: unknown[];
	};
	[k: string]: unknown;
}

/**
 * A user object in a REST API context.
 */
interface User {
	/**
	 * Unique identifier for the user.
	 */
	id: number;
	/**
	 * Login name for the user. Only present when using the 'edit' context.
	 */
	username?: string;
	/**
	 * Display name for the user.
	 */
	name: string;
	/**
	 * First name for the user. Only present when using the 'edit' context.
	 */
	first_name?: string;
	/**
	 * Last name for the user. Only present when using the 'edit' context.
	 */
	last_name?: string;
	/**
	 * The email address for the user. Only present when using the 'edit' context.
	 */
	email?: string;
	/**
	 * URL of the user.
	 */
	url: string;
	/**
	 * Description of the user.
	 */
	description: string;
	/**
	 * Author URL of the user.
	 */
	link: string;
	/**
	 * Locale for the user. Only present when using the 'edit' context.
	 */
	locale?: string;
	/**
	 * The nickname for the user. Only present when using the 'edit' context.
	 */
	nickname?: string;
	/**
	 * An alphanumeric identifier for the user.
	 */
	slug: string;
	/**
	 * Registration date for the user. Only present when using the 'edit' context.
	 */
	registered_date?: string;
	/**
	 * Roles assigned to the user. Only present when using the 'edit' context.
	 */
	roles?: string[];
	/**
	 * All capabilities assigned to the user. Only present when using the 'edit' context.
	 */
	capabilities?: {
		[k: string]: boolean;
	  };
	/**
	 * Any extra capabilities assigned to the user. Only present when using the 'edit' context.
	 */
	extra_capabilities?: {
		[k: string]: boolean;
	  };
	/**
	 * Avatar URLs for the user.
	 */
	avatar_urls?: {
	  /**
	   * Avatar URL with image size of 24 pixels.
	   */
	  "24": string;
	  /**
	   * Avatar URL with image size of 48 pixels.
	   */
	  "48": string;
	  /**
	   * Avatar URL with image size of 96 pixels.
	   */
	  "96": string;
	  /**
	   * Avatar URL with image of another size.
	   */
	  [k: string]: string;
	};
	/**
	 * Meta fields.
	 */
	meta:
	  | []
	  | {
		  [k: string]: unknown;
		};
	[k: string]: unknown;
  }

interface Term {
	/**
	 * Unique identifier for the term.
	 */
	id: number;
	/**
	 * Number of published posts for the term.
	 */
	count: number;
	/**
	 * HTML description of the term.
	 */
	description: string;
	/**
	 * URL of the term.
	 */
	link: string;
	/**
	 * HTML title for the term.
	 */
	name: string;
	/**
	 * An alphanumeric identifier for the term unique to its type.
	 */
	slug: string;
	/**
	 * Type attribution for the term.
	 */
	taxonomy: string;
	/**
	 * The parent term ID. Only present for hierarchical taxonomies.
	 */
	parent?: number;
	/**
	 * Meta fields.
	 */
	meta:
	  | []
	  | {
		  [k: string]: unknown;
		};
	[k: string]: unknown;
}

type Category = Term;
type Tag = Term;

interface MenuItem {
	ID: number,
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
