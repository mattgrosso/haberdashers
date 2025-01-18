<template>
  <div id="app">
    <nav v-if="showNavbar" class="navbar navbar-expand-lg navbar-light bg-light">
      <div class="container-fluid">
        <a class="navbar-brand" href="#">The Haberdasher Awards</a>
        <button class="navbar-toggler" type="button" @click="toggleNavbar" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav">
            <li class="nav-item">
              <router-link class="nav-link" to="/" @click="handleNavClick">Home</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/admin" @click="handleNavClick">Awards Config</router-link>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#" @click="logout">Logout</a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
    <router-view />
  </div>
</template>

<script>
import { Collapse } from "bootstrap";
import { auth } from "./firebase";
import { computed } from "vue";
import { useRoute } from "vue-router";

export default {
  name: "App",
  data() {
    return {
      isNavbarCollapsed: true,
    };
  },
  setup() {
    const route = useRoute();
    const showNavbar = computed(() => route.path !== "/login");
    return { showNavbar };
  },
  methods: {
    handleNavClick() {
      this.collapseNavbar();
    },
    toggleNavbar() {
      const navbar = document.getElementById("navbarNav");
      const bsCollapse = new Collapse(navbar, {
        toggle: false
      });
      if (this.isNavbarCollapsed) {
        bsCollapse.show();
      } else {
        bsCollapse.hide();
      }
      this.isNavbarCollapsed = !this.isNavbarCollapsed;
    },
    collapseNavbar() {
      const navbar = document.getElementById("navbarNav");
      const bsCollapse = new Collapse(navbar, {
        toggle: false
      });
      bsCollapse.hide();
      this.isNavbarCollapsed = true;
    },
    async logout() {
      try {
        await auth.signOut();
        this.collapseNavbar();
        this.$router.push("/login");
      } catch (error) {
        console.error("Error logging out:", error);
      }
    }
  }
};
</script>

<style>

</style>