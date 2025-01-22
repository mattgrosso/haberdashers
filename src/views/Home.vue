<template>
  <div class="home">
    <div class="px-3">
      <h2 v-if="userName" class="text-center my-3">Welcome, {{ userName }}!</h2>
      <p>Here is your 2024 ballot.</p>
      <p>Please rank the nominees in each category from your favorite at the top to your least favorite at the bottom.</p>
      <p>It's ok if you haven't seen all of (or many of) the nominees. Just rank the ones you have seen.</p>
      <p>When you are finished, save your ballot.</p>
      <p>You'll be able to make changes to your ballot up until the deadline at which time the ballots will be locked and the results tabulated.</p>
    </div>
    <Ballot />
  </div>
</template>

<script>
import { auth } from "../assets/javascript/firebase.js";
import Ballot from "../components/Ballot.vue";

export default {
  name: "Home",
  components: {
    Ballot,
  },
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

<style lang="scss">
.home {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
</style>