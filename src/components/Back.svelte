<script>
  import {push} from 'svelte-spa-router'
  export let href;
  export let beforeCallback;
  
  function callback(e) {
    e.preventDefault();
    if (beforeCallback && typeof beforeCallback === "function") {
      beforeCallback();
    }
    push(href);
  }
</script>

<div class="back">
  <a class="back-button b bh" href="{`#${href}`}" on:click={callback}>❮</a>
</div>

<style>
 .back {
    width: 100%;
    display: flex;
  }
  .back .back-button {
    width: auto;
    float: left;
    padding: 15px 30px;
    margin: 10px 0;
    text-decoration: none;
  }
</style>
