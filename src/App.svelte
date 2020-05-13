<script>
	import Router from 'svelte-spa-router'
  import routes from './routes';
</script>

 <div class="page">
		<Router {routes}/>
 </div>

<style>
	.page {
		max-width: 600px;
		margin: 0 auto;
	}
</style>