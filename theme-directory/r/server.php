<html>
	<head>
	<script>
		var global = window;
		var require = function(){}
		var process = {
			env: {
				NODE_ENV: true
			}
		}
		var PHP = {
			render: ( html ) => {
				console.log(html);
				document.body.innerHTML = html
			}
		}
	</script>
		<script src="<?php echo get_template_directory_uri() . '/../../frontity-app/server-bundle.js' ?>"></script>
		<script>
			window.render().then( html => console.log( html ) )
		</script>
	</head>
</html>
