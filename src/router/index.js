import { createRouter, createWebHistory } from "vue-router";
import Home from "../views/Home.vue";
import AwardsConfig from "../views/AwardsConfig.vue";
import BallotManagement from "../views/BallotManagement.vue";
import Login from "../views/Login.vue";
import Results from "../views/Results.vue"; // Import the new Results component
import { auth } from "../assets/javascript/firebase";
import { getDatabase, ref, get } from "firebase/database";

const db = getDatabase();

const routes = [
  {
    path: "/",
    component: Home,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: "/login",
    component: Login,
    meta: {
      requiresAuth: false
    }
  },
  {
    path: "/admin",
    component: AwardsConfig,
    meta: {
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: "/ballot-management",
    component: BallotManagement,
    meta: {
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: "/results",
    component: Results, // Add the new Results route
    meta: {
      requiresAuth: true
    }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin);
  const isAuthenticated = auth.currentUser;

  if (requiresAuth && !isAuthenticated) {
    next("/login");
  } else if (requiresAdmin) {
    if (isAuthenticated) {
      const adminRef = ref(db, "admins");
      const snapshot = await get(adminRef);
      const adminUsers = snapshot.exists() ? snapshot.val() : [];
      const userIsAdmin = adminUsers.includes(auth.currentUser.uid);

      if (userIsAdmin) {
        next();
      } else {
        next("/");
      }
    } else {
      next("/login");
    }
  } else {
    next();
  }
});

export default router;