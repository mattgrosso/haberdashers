<template>
  <div class="results p-3 mb-5">
    <div v-for="award in sortedAwards" :key="award[0]" class="mb-4 card">
      <div class="card-header bg-primary text-white">
        <h3>{{ award[1].name }}</h3>
      </div>
      <div v-if="winners[award[0]]?.winner" class="card-body">
        <ul class="list-group">
          <li class="list-group-item list-group-item-success winner-item" v-for="(nominee, index) in tiedWinners(award)" :key="index">
            <span class="d-flex col-9"><strong>{{ nominee }}</strong></span>
            <span class="vote-count d-flex col-3 justify-content-end align-items-center">({{ nomineeVotes(award, nominee) }}<span v-if="isVoteTied(award, nominee)"><span class="vote-count">.{{ nomineeBorda(award, nominee) }}</span></span> votes)</span>
          </li>
          <li class="list-group-item nominee-item" v-for="(nominee, index) in rankedNominees(award)" :key="index" v-show="!tiedWinners(award).includes(nominee)">
            <span class="d-flex col-9">{{ nominee }}</span>
            <span v-if="nomineeVotes(award, nominee)" class="d-flex col-3 justify-content-end"><span class="vote-count">({{ nomineeVotes(award, nominee) }}<span v-if="isVoteTied(award, nominee)"><span class="vote-count">.{{ nomineeBorda(award, nominee) }}</span></span> votes)</span></span>
          </li>
        </ul>
        <hr class="mt-4 col-9 mx-auto"/>
        <div class="chart-container">
          <line-chart v-if="winners[award[0]]?.rounds" :data="getChartData(award[0])" :options="chartOptions"></line-chart>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getDatabase, ref, get } from "firebase/database";
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement, LinearScale, CategoryScale } from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, LinearScale, CategoryScale);

const db = getDatabase();

export default {
  name: "Results",
  components: {
    LineChart: Line
  },
  data () {
    return {
      awards: {},
      winners: {}
    };
  },
  computed: {
    sortedAwards () {
      return Object.entries(this.awards || {}).sort((a, b) => a[1].rank - b[1].rank);
    },
    lastYear () {
      return new Date().getFullYear() - 1;
    },
    chartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom', // Move the legend to the bottom
            labels: {
              font: {
                size: 10, // Reduce the font size
                family: 'Arial, sans-serif'
              },
              boxWidth: 10, // Reduce the box width
              padding: 10 // Reduce the padding
            }
          },
          title: {
            display: true,
            text: 'Instant Runoff Voting Rounds',
            font: {
              size: 10,
              family: 'Arial, sans-serif',
              weight: 'bold'
            },
            color: '#333'
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            titleFont: {
              size: 14,
              family: 'Arial, sans-serif',
              weight: 'bold'
            },
            bodyFont: {
              size: 12,
              family: 'Arial, sans-serif'
            },
            footerFont: {
              size: 10,
              family: 'Arial, sans-serif'
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 12,
                family: 'Arial, sans-serif'
              },
              color: '#333'
            }
          },
          y: {
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              font: {
                size: 12,
                family: 'Arial, sans-serif'
              },
              color: '#333'
            }
          }
        }
      };
    }
  },
  methods: {
    async fetchResults () {
      try {
        const awardsRef = ref(db, "awards");
        const awardsSnap = await get(awardsRef);
        this.awards = awardsSnap.val() || {};

        const results = {};
        for (const awardKey of Object.keys(this.awards)) {
          const resultsRef = ref(db, `awards/${awardKey}/years/${this.lastYear}/results`);
          const resultsSnap = await get(resultsRef);
          results[awardKey] = resultsSnap.val() || {};
        }
        this.winners = results;
      } catch (error) {
        console.error("Error fetching results:", error);
      }
    },
    rankedNominees (award) {
      return this.winners[award[0]].rankedNominees;
    },
    nomineeVotes (award, nominee) {
      const rounds = this.winners[award[0]].rounds;
      return rounds[rounds.length - 1].votes[nominee];
    },
    nomineeBorda (award, nominee) {
      const rounds = this.winners[award[0]].rounds;
      return rounds[rounds.length - 1].borda[nominee];
    },
    isVoteTied (award, nominee) {
      const rounds = this.winners[award[0]].rounds;
      const lastRoundVotes = rounds[rounds.length - 1].votes;
      const nomineeVotes = lastRoundVotes[nominee];
      return Object.values(lastRoundVotes).filter(votes => votes === nomineeVotes).length > 1;
    },
    isBordaTied (award, nominee) {
      const rounds = this.winners[award[0]].rounds;
      const lastRoundBorda = rounds[rounds.length - 1].borda;
      const nomineeBorda = lastRoundBorda[nominee];
      return Object.values(lastRoundBorda).filter(borda => borda === nomineeBorda).length > 1;
    },
    isTied (award, nominee) {
      return this.isVoteTied(award, nominee) && this.isBordaTied(award, nominee);
    },
    tiedWinners (award) {
      const rounds = this.winners[award[0]].rounds;
      const lastRoundVotes = rounds[rounds.length - 1].votes;
      const lastRoundBorda = rounds[rounds.length - 1].borda;
      const maxVotes = Math.max(...Object.values(lastRoundVotes));
      const maxBorda = Math.max(...Object.values(lastRoundBorda));
      return Object.keys(lastRoundVotes).filter(nominee => lastRoundVotes[nominee] === maxVotes && lastRoundBorda[nominee] === maxBorda);
    },
    getChartData (awardKey) {
      const awardResults = this.winners[awardKey];
      if (!awardResults || !awardResults.rounds) return {};

      const labels = awardResults.rounds.map((_, index) => `Round ${index + 1}`);
      const datasets = Object.keys(awardResults.rounds[0].votes || {}).map(nominee => {
        return {
          label: nominee,
          data: awardResults.rounds.map(round => round.votes[nominee] || 0),
          borderColor: this.getRandomColor(),
          fill: false,
          tension: 0.4
        };
      });

      return {
        labels,
        datasets
      };
    },
    getRandomColor () {
      const letters = '0123456789ABCDEF';
      let color = '#';
      for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
      }
      return color;
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

  .winner-item {
    display: flex;
    font-size: 1.25rem;
    font-weight: bold;
    line-height: 1.3;

    .vote-count {
      font-size: 0.75rem;
    }
  }

  .nominee-item {
    display: flex;
    font-size: 0.875rem;

    .vote-count {
      font-size: 0.65rem;
    }
  }

  .chart-container {
    position: relative;
    height: 400px; /* Set a minimum height for the charts */
    width: 100%;
  }
}
</style>
