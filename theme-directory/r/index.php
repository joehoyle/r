<html <?php echo $render['helmet']->htmlAttributes ?>>
	<head>
		<?php echo $render['helmet']->title ?>
		<?php echo $render['helmet']->meta ?>
		<?php echo $render['helmet']->link ?>
		<?php echo $render['helmet']->noscript ?>
		<?php echo $render['helmet']->script ?>
		<?php echo $render['helmet']->style ?>
		<?php if ( $render['style'] ) : ?>
			<link rel="stylesheet" type="text/css" href="<?php echo $render['style'] ?>" />
		<?php endif ?>
	</head>
	<body <?php echo $render['helmet']->bodyAttributes ?>>
		<div id="root" data-rendered=""><?php echo $render['body'] ?></div>
		<?php if ( $render['data'] ) : ?>
			<script>
				var WPData = <?php echo wp_json_encode( $render['data'] ) ?>;
				var isSSR = false;
			</script>
		<?php endif ?>
		<?php if ( $render['script'] ) : ?>
			<script async src="<?php echo $render['script'] ?>"></script>
		<?php endif ?>
	</body>
</html>
