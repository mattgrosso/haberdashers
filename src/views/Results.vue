<template>
  <div class="results p-3 mb-5">
    <div class="card">
      <div class="card-header bg-primary text-white">
        <h2 class="card-title text-center">{{this.lastYear}} Results</h2>
      </div>
      <div class="card-body">
        <div v-for="award in sortedAwards" :key="award[0]" class="mb-4">
          <h3>{{ award[1].name }} ({{ winners[award[0]]?.ballots || 0 }} ballots)</h3>
          <ul class="list-group">
            <li class="list-group-item" v-for="nominee in sortedNominees(award)" :key="nominee[0]" :class="{'list-group-item-success': nominee[1].rank === 1}">
              <span v-if="award[0] === 'The_Haberdasher_Legacy_Award'">{{ nominee[0] }} - {{ nominee[1].borda }} points</span>
              <span v-else>{{ nominee[1].rank }}. {{ nominee[0] }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getDatabase, ref, get } from "firebase/database";

const db = getDatabase();

export default {
  name: "Results",
  data () {
    return {
      awards: {},
      winners: {}
    };
  },
  computed: {
    sortedAwards () {
      return Object.entries(this.awards).sort((a, b) => a[1].rank - b[1].rank);
    },
    lastYear () {
      return new Date().getFullYear() - 1;
    }
  },
  methods: {
    async fetchResults () {
      try {
        const awardsRef = ref(db, "awards");
        const awardsSnap = await get(awardsRef);
        this.awards = awardsSnap.val();

        const results = {};
        for (const awardKey of Object.keys(this.awards)) {
          const resultsRef = ref(db, `awards/${awardKey}/years/${this.lastYear}/results`);
          const resultsSnap = await get(resultsRef);
          results[awardKey] = resultsSnap.val();
        }
        this.winners = results;
        console.log("Fetched results:", this.winners);
      } catch (error) {
        console.error("Error fetching results:", error);
      }
    },
    sortedNominees (award) {
      const nominees = this.winners[award[0]]?.nominees;
      if (!nominees) return [];
      return Object.entries(nominees).sort((a, b) => award[0] === 'The_Haberdasher_Legacy_Award' ? b[1].borda - a[1].borda : a[1].rank - b[1].rank);
    }
  },
  async mounted () {
    await this.fetchResults();
  }
};
</script>

<style lang="scss">
@import "@/assets/custom-bootstrap.scss";

.results {
  max-width: 800px;
  margin: 0 auto;

  .card-header {
    background-color: $primary;
    color: white;
  }

  .list-group-item-success {
    background-color: $success !important;
    color: white !important;
  }
}
</style>
