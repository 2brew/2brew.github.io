<script>
  import {resolveSystemIcon} from '../utils/common';
  import {translations, tt, setLanguage} from '../store/tt';

  const systems = [
    {name: 'system.aeropress', url: 'aeropress', icon: resolveSystemIcon('aeropress')},
    {name: 'system.v60', url: 'v_60', icon: resolveSystemIcon('v_60')},
    {name: 'system.moka', url: 'moka', icon: resolveSystemIcon('moka')}
  ];

  function toggleLang() {
    if ($translations.language === 'en'){
      setLanguage('ru');
    } else {
      setLanguage('en');
    }
  }

</script>

{#each systems as item}
  <div class="item">
    <a class="system-button bh" href="#/{item.url}" title={tt($translations, item.name)}>
      <div class="system-icon">
        {@html item.icon}
      </div>
      <div class="system-name">{tt($translations, item.name)}</div>
    </a>
  </div>
{/each}

<div class="lang bb" on:click={toggleLang}>
  {$translations.language}
</div>

<style>
  .item {
    width: 33.3%;
    box-sizing: border-box;
    padding: 10px 10px 10px 0;
    float: left;
    margin-top: 10px;
    position: relative;
  }
  .item:last-of-type {
    padding-right: 0;
  }
  .system-button {
    display: flex;
    text-decoration: none;
    flex-direction: column;
    align-items: center;
  }
  .system-icon {
    width: 50%;
    margin: 14px;
    display: block;
  }
  .system-name {
    color: var(--default-text-color);
    text-align: center;
    display: block;
    font-size: 20px;
    padding: 15px 0;
  }
  .lang {
    position: absolute;
    width: 60px;
    height: 60px;
    border-radius: 30px;
    bottom: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    left: 20px;
    cursor: pointer;
  }
</style>
