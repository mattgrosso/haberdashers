<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: "App",
};
</script>

<style>
/* Basic styling for the navigation */
nav {
  margin-bottom: 20px;
}
nav ul {
  list-style: none;
  padding: 0;
  display: flex;
  gap: 10px;
}
nav li {
  display: inline;
}
</style>