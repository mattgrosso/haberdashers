<template>
  <div class="home">
    <div class="px-3">
      <h2 v-if="userName" class="text-center my-3">Welcome, {{ userName }}!</h2>
      <template v-if="isVotingOpen">
        <p>Voting is open for {{ votingYear }}!</p>
        <p>Rank your favorites below.<br/>(It's ok if you haven't seen them all. Just rank the ones you have seen and liked)</p>
      </template>
      <template v-else-if="resultsPublished">
        <div class="alert alert-success text-center mb-4">
          <h4 class="alert-heading">The {{ votingYear }} Haberdasher Awards results are in!</h4>
          <p class="mb-0">Congratulations to all the winners.</p>
        </div>
      </template>
    </div>
    <results-display v-if="resultsPublished" :year="votingYear" />
    <Ballot v-else />
  </div>
</template>

<script>
import { auth } from "../assets/javascript/firebase.js";
import Ballot from "../components/Ballot.vue";
import ResultsDisplay from "../components/ResultsDisplay.vue";

export default {
  name: "Home",
  components: {
    Ballot,
    ResultsDisplay
  },
  computed: {
    userName () {
      return auth.currentUser ? auth.currentUser.displayName : null;
    },
    votingYear () {
      // Use the most recent year with published results, falling back to selected year
      const publishedYear = this.$store.getters.availableYears.find(year => {
        return this.$store.state.yearConfigs[year]?.resultsPublished;
      });
      return publishedYear || this.$store.getters.selectedYear || new Date().getFullYear();
    },
    isVotingOpen () {
      const config = this.$store.state.yearConfigs[this.votingYear];
      return config?.votingOpen || false;
    },
    resultsPublished () {
      const config = this.$store.state.yearConfigs[this.votingYear];
      return config?.resultsPublished || false;
    }
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
