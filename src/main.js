import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { auth } from "./firebase";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";
import "@popperjs/core";

let app;

auth.onAuthStateChanged((user) => {
  if (!app) {
    app = createApp(App);
    app.use(router);
    app.mount("#app");
  }

  if (user) {
    if (router.currentRoute.value.path === "/login") {
      router.push("/");
    }
  } else {
    if (router.currentRoute.value.meta.requiresAuth) {
      router.push("/login");
    }
  }
});