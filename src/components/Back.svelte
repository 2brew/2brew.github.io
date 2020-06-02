<script>
  import {push, link} from 'svelte-spa-router'
  export let href;
  // export let beforeCallback;
  
  // function callback(e) {
  //   e.preventDefault();
  //   if (beforeCallback && typeof beforeCallback === "function") {
  //     beforeCallback();
  //   }
  //   push(href);
  // }
</script>

<div class="back">
  <a class="back-button bb" href="{href}" use:link>❮</a>
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
