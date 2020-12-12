<html <?php echo $render['helmet']->htmlAttributes ?>>
	<head>
		<?php echo $render['helmet']->title ?>
		<?php echo $render['helmet']->meta ?>
		<?php echo $render['helmet']->link ?>
		<?php echo $render['helmet']->noscript ?>
		<?php echo $render['helmet']->script ?>
		<?php echo $render['helmet']->style ?>
		<?php if ( $render['style'] ) : ?>
			<link rel="stylesheet" type="text/css" href="https://unpkg.com/tailwindcss@2.0.1/dist/tailwind.min.css" />
		<?php endif ?>
	</head>
	<body <?php echo $render['helmet']->bodyAttributes ?>>
		<div id="root" <?php echo $render['body'] ? 'data-rendered=""' : ''?>><?php echo $render['body'] ?></div>
		<?php if ( isset( $render['data'] ) ) : ?>
			<script>
				var WPData = <?php echo wp_json_encode( $render['data'] ) ?>;
				var isSSR = false;
				var global = {};
				var require = () => ({})
			</script>
		<?php endif ?>
		<?php if ( isset( $render['dev-scripts'] ) ) : ?>
			<script type="module" src='http://localhost:3000/vite/client'></script>
			<script type="module">
				import RefreshRuntime from "http://localhost:3000/@react-refresh"
				RefreshRuntime.injectIntoGlobalHook(window)
				window.$RefreshReg$ = () => {}
				window.$RefreshSig$ = () => (type) => type
				window.__vite_plugin_react_preamble_installed__ = true
			</script>
			<script type="module" sync src="http://localhost:3000/node_modules/wordpress-r/theme/index.tsx"></script>
		<?php elseif ( isset( $render['script'] ) ) : ?>
			<script async src="<?php echo $render['script'] ?>"></script>
		<?php endif ?>
	</body>
</html>
