# R - WordPress Themes in React

Write WordPress themes in React, zero config.

---

R provides the ability to develop your WordPress site using React, following similar concepts to WordPress themes in PHP, but in JavaScript.

R handles server rendering, front-end routing, integration with WP-Rewrites, building ES6/JavaScript, type-checking, hydration, hot-reloading and more.

Just create `Single.tsx` like you would `single.php` and enjoy never having configure a complex setup of `wp_enqueue_script`, pre-loading data and JavaScript building again.

## Todo

R is still very early and experimental. Todo list:

- [x] HMR / Live Reload JS
- [x] Live reload on CSS
- [ ] WordPress Menus
- [ ] `isSingle` etc functions
- [ ] Dynamic Template Loading
- [ ] Post Previews
- [ ] Public Query Vars for post types
- [ ] Query Monitor support
- [ ] Page Titles API
- [ ] TypeScript types for all objects
- [ ] `useData` hook with SSR support
- [ ] Configure SSR-only, front-end only or isomorphic renderiing

## Get Started

Prerequisites: The [V8JS PHP module](https://github.com/phpv8/v8js/) to provide server-side rendering (with libv8 7.5+).

Install the R WordPress plugin.

`composer require joehoyle/r`

Create a new theme in `/wp-content/themes` with a `package.json` depending on `joehoyle/r`.

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
npm run r build
```

Activate the theme, and view your site!
