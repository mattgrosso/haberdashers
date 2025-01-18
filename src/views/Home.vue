<template>
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-md-6 text-center">
        <p v-if="userName">Welcome, {{ userName }}!</p>
      </div>
    </div>
  </div>
</template>

<script>
import { auth } from "../firebase";

export default {
  name: "Home",
  computed: {
    userName() {
      return auth.currentUser ? auth.currentUser.displayName : null;
    },
  },
  methods: {
    async logout() {
      try {
        await auth.signOut();
        this.$router.push("/login");
      } catch (error) {
        console.error("Error logging out:", error);
      }
    },
  },
};
</script>