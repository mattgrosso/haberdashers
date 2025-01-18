<template>
  <div>
    <p>Home!</p>
    <p v-if="userName">Welcome, {{ userName }}!</p>
    <button @click="logout">Log out</button>
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