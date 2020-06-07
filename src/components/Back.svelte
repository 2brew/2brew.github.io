<script>
  import {push, link} from 'svelte-spa-router'
  export let href;
  export let nomargin;
</script>

<div class="back">
  <a class="back-button bh" class:no-margin={nomargin} href="{href}" use:link>❮</a>
</div>

<style>
 .back {
    width: 100%;
    display: flex;
  }
  .back .back-button {
    float: left;
    display: flex;
    justify-content: center;
    padding: 15px 0;
    min-width: 60px;
    margin: 20px 5px 10px 0;
    text-decoration: none;
  }
  .back-button.no-margin {
    margin: 0;
  }
</style>
