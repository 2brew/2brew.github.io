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
  <a class="back-button" href="{`#${href}`}" on:click={callback}>❮</a>
</div>

<style>
 .back {
    width: 100%;
    display: flex;
  }
  .back .back-button {
    width: auto;
    color: var(--default-text-color);
    float: left;
    padding: 15px 30px;
    margin: 10px 0;
    border-radius: 10px;
    box-shadow: 0px 0px 2px 0px rgba(0,0,0,0.2);
    text-decoration: none;
  }
</style>
