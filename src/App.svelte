<script>
	import Router from 'svelte-spa-router'
	import {onMount} from 'svelte';
	import routes from './routes';
	import {fetchRecipes} from './store/recipes.js';

	onMount(() => fetchRecipes());
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