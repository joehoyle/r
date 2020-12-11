# R - WordPress Themes in React

Write WordPress themes in React, zero config.

---

R provides the ability to develop your WordPress site using React, following similar concepts to WordPress themes in PHP, but in JavaScript.

R handles server rendering, front-end routing, integration with WP-Rewrites, building ES6/JavaScript, type-checking, hydration, hot-reloading and more.

Just create `Single.tsx` like you would `single.php` and enjoy never having configure a complex setup of `wp_enqueue_script`, pre-loading data and JavaScript building again.

## Todo

R is still very early and experimental. Todo list:

- [x] HMR / Live Reload JS
- [ ] Live reload on CSS
- [x] WordPress Menus
   - [ ] Menu registration
- [x] `isSingle` etc functions
   - [x] Update to use context
- [x] Dynamic Template Loading
- [ ] Post Previews
- [ ] Public Query Vars for post types
- [ ] Query Monitor support
- [ ] Document Title API
- [ ] TypeScript types for all objects
- [x] `useData` hook with SSR support
- [ ] Configure SSR-only, front-end only or isomorphic rendering
- [ ] Current user / `isLoggedIn()`
- [ ] Widgets / Sidebars
- [ ] Theme supports
- [ ] Register image sizes
- [ ] Reading settings

## Get Started

Prerequisites: The [V8JS PHP module](https://github.com/phpv8/v8js/) to provide server-side rendering (with libv8 7.5+).

Install the R WordPress plugin.

`composer require joehoyle/r`

Create a new theme in `/wp-content/themes` with a `package.json` depending on `joehoyle/r`, a `style.css` and a `Layout.tsx`.

```
// style.css
/**
 * Theme Name: My Theme
 * Template: R
 */

// package.json
{
	"require": {
		"joehoyle/r": "*"
	}
}

// Layout.tsx
export default function Layout( { children }) {
	return <div id="site-wrapper">
		<h1>My Site</h1>
		{children}
	</div>
}
```

```
npm install
npm run r

// Optionally, watch and auto-rebuild
npm run r --watch
```

Activate the theme, and view your site!

## Layout Template

R provides the additional ability control the overall layout via the `Layout.tsx` template file. This is typically acheived with a combination of `header.php` and `footer.php` in WordPress PHP themes, R supports those too, but everything should included in a top level `Layout.tsx`. the `children` prop will be the matched route, and your template files will automatically be rendered via the `children` prop.

#### Example Layout.tsx

```js
import Header from './Header';
import Footer from './Footer';

export default function Layout( { children }) {
	return <div id="site-wrapper">
		<Header />
			{children}
		<Footer>
	</div>
}
```


## Template Hierarchy

Implementing the WordPress theme [template hierarchy](https://developer.wordpress.org/themes/basics/template-hierarchy/#single-post), R will look for the following templates in your theme's root.

|Template|Props|
|--|--|
|Archive.tsx|`{ posts: Post[] }`|
|Attachment.tsx|`{ attachment: Media }`|
|Author.tsx|`{ posts: Post[], author: User }`|
|Category-{$categorySlug}.tsx|`{ page: Page, category: Category }`|
|Category.tsx|`{ page: Page, category: Category }`|
|FrontPage.tsx|`{ page: Page }`|
|Index.tsx|`{ posts: Post[] }`|
|Page.tsx|`{ page: Page }`|
|Search.tsx|`{ posts: Post[], search: string }`|
|Single.tsx|`{ post: Post }`|
|Single{$postType}-{$postSlug}.tsx|`{ post: Post }`|
|Single{$postType}.tsx|`{ post: Post }`|
|Singular.tsx|`{ post: Post }`|
|Tag-{$tagSlug}.tsx|`{ page: Page, tag: Tag }`|
|Tag.tsx|`{ page: Page, tag: Tag }`|

## Conditional Tags

Like the WordPress theme [conditional tags](https://developer.wordpress.org/themes/basics/conditional-tags/) R implements many conditionals that can be used outside of templates where it may not be clear what the current route matches.

All conditioals should be imported from R:

```
import { isSingle } from 'wordpress-r';
```

- `is404()`
- `isArchive()`
- `isAttachment()`
- `isAuthor()`
- `isCategory()`
- `isPage()`
- `isPageTemplate()`
- `isPreview()`
- `isSearch()`
- `isSingle()`
- `isSingular()`
- `isSticky()`
- `isTag()`
- `isTax()`

## Fetching Data

R provides APIs to fetch data for you theme. All data loading is done via the REST API. In server-side rendering REST API requests are internally routed for synchronious data loading.

See "Template Hiereachy" to see what data is already available to each template via the component's props. Any additional data fetching should use the `useData` hook.

```js
import { useData } from 'wordpress-r';

export function Comments( { post: Post } ) {
	const [ isLoading, comments, error ] = useData( '/wp/v2/comments', { post: post.id } );
	if ( comments ) {
		return <ul>
			{ comments.map( comment => (
				<li key={ comment.id }>{ comment.content.rendered }</li>
			) ) }
		</ul>
	}
}
```

## Server-side Rendering Conditionals

To increase speed of load times, you may want to only rendering some things server-side. For example, you may chose to not render non-essential widgets or recommender blocks on the server, so the initial page load is fast. To do so, just use the `isSSR` export from R to conditionally render the component. R's automatic browser hydration will mean it's grracefully loaded on the client-side once the page has loaded:

```js
import { isSSR } from 'wordpress-r';

export function Single( { post: Post } ) {
	return <>
		<h1>{ post.title.rendered }</hi>
		<div dangerouslySetInnerHTML={ { __html: props.post.content.rendered } } />
		{ ! isSSR && <RelatedPosts post={ post }> }
	</>
}
```
