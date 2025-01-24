<template>
  <div id="app">
    <nav v-if="showNavbar" class="navbar navbar-expand-lg navbar-dark bg-dark p-0">
      <div class="container-fluid">
        <router-link class="navbar-brand" to="/">
          <img src="@/assets/images/icon.png" alt="Logo" class="navbar-icon" />
          The Haberdashers
        </router-link>
        <button class="navbar-toggler" type="button" @click="toggleNavbar" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <div :class="{'navbar-toggler-icon': true, 'open': !isNavbarCollapsed}">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
        <div class="collapse navbar-collapse justify-content-end" id="navbarNav">
          <ul class="navbar-nav align-items-center">
            <li v-if="userIsAdmin" class="nav-item text-center">
              <router-link class="nav-link text-white" to="/" @click="handleNavClick">Ballot</router-link>
            </li>
            <li v-if="userIsAdmin" class="nav-item text-center">
              <router-link class="nav-link text-white" to="/admin" @click="handleNavClick">Awards Config</router-link>
            </li>
            <li v-if="userIsAdmin" class="nav-item text-center">
              <router-link class="nav-link text-white" to="/ballot-management" @click="handleNavClick">Ballot Management</router-link>
            </li>
            <li class="nav-item text-center">
              <a class="nav-link text-white" href="#" @click="logout">Logout</a>
            </li>
          </ul>
        </div>
      </div>
      <span class="version">{{version}}</span>
    </nav>
    <router-view class="p-3"/>
  </div>
</template>

<script>
import { Collapse } from "bootstrap";
import { auth } from "./assets/javascript/firebase.js";
import { getDatabase, ref, get } from "firebase/database";
import { useRoute } from "vue-router";

const db = getDatabase();

export default {
  name: "App",
  data() {
    return {
      isNavbarCollapsed: true,
      showNavbar: true,
      adminUsers: [] // Initialize adminUsers as an empty array
    };
  },
  async mounted() {
    const route = useRoute();
    this.showNavbar = route.path !== "/login";
    await this.fetchAdminUsers();
  },
  computed: {
    userIsAdmin() {
      return auth.currentUser ? this.adminUsers.includes(auth.currentUser.uid) : false;
    },
    version () {
      return process.env.VUE_APP_VERSION;
    },
  },
  methods: {
    async fetchAdminUsers() {
      try {
        const adminRef = ref(db, "admins");
        const snapshot = await get(adminRef);
        if (snapshot.exists()) {
          this.adminUsers = snapshot.val();
        } else {
          console.error("No admin data available");
        }
      } catch (error) {
        console.error("Error fetching admin users:", error);
      }
    },
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

<style lang="scss">
@import "@/assets/custom-bootstrap.scss";

body, html {
  font-family: 'Cabin', sans-serif !important;
}

.navbar {
  background-color: $dark !important;
  position: relative;

  .navbar-brand {
    color: white !important;
    display: flex;
    align-items: center;
    font-family: 'Engagement', cursive;
    font-size: 2.8rem;

    .navbar-icon {
      height: 48px;
      margin-right: 10px;
    }
  }

  .navbar-nav {
    .nav-item {
      .nav-link {
        color: white !important;
    
        &:hover {
          color: $warning !important;
        }
    
        &.active {
          color: $warning !important;
        }
      }
    }
  }

  .navbar-toggler {
    padding: 0.25rem 0.75rem;
    font-size: 1rem;
    line-height: 1.5;
    border: 0;
    border-radius: 0.25rem;

    &:focus {
      outline: none;
      box-shadow: none !important;
    }

    .navbar-toggler-icon {
      position: relative;
      width: 1.5rem;
      height: 1.5rem;
      display: inline-block;
      background: none;
      border: none;
      cursor: pointer;

      span {
        background-color: white;
        display: block;
        height: 2px;
        left: 50%;
        position: absolute;
        transform: translateX(-50%);
        transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
        width: 20px;
      }

      span:nth-child(1) {
        top: 4px;
      }

      span:nth-child(2) {
        top: 11px;
      }

      span:nth-child(3) {
        top: 18px;
      }
    }

    .navbar-toggler-icon.open {
      span:nth-child(1) {
        transform: rotate(45deg) translate(-1px, 11px);
      }

      span:nth-child(2) {
        opacity: 0;
      }

      span:nth-child(3) {
        transform: rotate(-45deg) translate(-1px, -11px);
      }
    }
  }

  .version {
    color: white;
    font-size: 0.5rem;
    left: 3px;
    position: absolute;
    top: 2px;
  }
}

@media (max-width: 991px) {
  .navbar-nav {
    .nav-item {
      border-top: 1px solid white;
      width: 100%;

      &:last-of-type {
        border-bottom: 1px solid white;
      }
    }
  }
}

.container-fluid {
  max-width: 1200px;
  margin: 0 auto;
}

.router-view {
  max-width: 1200px;
  margin: 0 auto;
}
</style>