<script>
  import {link} from 'svelte-spa-router'
  import Error from '../components/Error.svelte';
  import {toMSS} from '../utils/time'
  import {fetchRecipes, recipes} from '../store/recipes';
  
  export let params = {};

  $: {
    fetchRecipes(params.type);
  }
</script>

<style>
  .list {
    padding: 10px 0;
  }
  .recipe {
    width: 100%;
    padding: 15px 10px;
    margin: 10px;
    border-radius: 10px;
    box-shadow: 0px 0px 2px 0px rgba(0,0,0,0.2);
    text-decoration: none;
    display: flex;
    justify-content: flex-start;
  }
  .recipe-icon {
    width: 50px;
    height: 50px;
    margin-right: 10px
  }
  .recipe-data {
    height: 50px;
    flex-grow: 1;
    color: var(--default-text-color);
  }
  .recipe-name {
    font-size: 18px;
  }
  .recipe-ingridients {
      font-size: 13px;
      margin-top: 10px
  }
</style>
<div class="list">
  {#if $recipes.error}
    <Error error={$recipes.error}/>
  {:else if $recipes.isFetching}
    Loading...
  {:else}
    {#each $recipes.value as recipe}
      <a class="recipe" href="/{params.type}/{recipe.name}" use:link>
        <img class="recipe-icon" src={`/public/icons/${params.type}.svg`} alt={recipe.name}>
        <div class="recipe-data">
            <div class="recipe-name">{recipe.title}</div>
            <div class="recipe-ingridients">
              {toMSS(recipe.ingridients.time)}
            </div>
          </div>
      </a>
    {/each}
  {/if}
</div>


