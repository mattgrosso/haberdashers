import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { auth } from "./assets/javascript/firebase";
import "./assets/custom-bootstrap.scss"; // Import custom Bootstrap styles
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