<template>
  <div class="results p-3 mb-5">
    <div class="year-selector mb-4">
      <label for="year-select" class="form-label">Select Year:</label>
      <select id="year-select" v-model="selectedYear" @change="onYearChange" class="form-select">
        <option v-for="year in availableYears" :key="year" :value="year">
          {{ year }} Results
        </option>
      </select>
    </div>
    <results-display v-if="selectedYear" :year="selectedYear" />
  </div>
</template>

<script>
import ResultsDisplay from "../components/ResultsDisplay.vue";

export default {
  name: "Results",
  components: {
    ResultsDisplay
  },
  data () {
    return {
      selectedYear: null
    };
  },
  computed: {
    availableYears () {
      return this.$store.getters.availableYears.filter(year => {
        const config = this.$store.state.yearConfigs[year];
        return config?.resultsPublished;
      });
    }
  },
  methods: {
    onYearChange () {
      this.$store.dispatch('setSelectedYear', this.selectedYear);
    }
  },
  async mounted () {
    if (!this.$store.getters.selectedYear) {
      await this.$store.dispatch('initializeYears');
    }

    if (this.availableYears.length > 0) {
      this.selectedYear = this.availableYears[0];
    }
  },
  watch: {
    '$store.state.selectedYear' (newYear) {
      if (newYear && newYear !== this.selectedYear) {
        this.selectedYear = newYear;
      }
    }
  }
};
</script>

<style lang="scss">
@import "@/assets/custom-bootstrap.scss";

.results {
  max-width: 800px;
  margin: 0 auto;

  .year-selector {
    display: flex;
    align-items: center;
    gap: 1rem;

    .form-label {
      margin-bottom: 0;
      font-weight: bold;
    }

    .form-select {
      max-width: 200px;
    }
  }
}
</style>
