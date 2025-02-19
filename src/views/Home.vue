<template>
  <div class="home">
    <div class="px-3">
      <h2 v-if="userName" class="text-center my-3">Welcome, {{ userName }}!</h2>
      <p>Voting on the 2024 ballot is now closed.</p>
      <p>The winners will be announced soon.</p>
    </div>
    <!-- <Ballot /> -->
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
    userName () {
      return auth.currentUser ? auth.currentUser.displayName : null;
    },
  },
  methods: {
    async logout () {
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