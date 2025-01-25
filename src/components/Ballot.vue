<template>
  <div class="ballot p-3 mb-5">
    <div v-for="award in sortedAwards" :key="award.key" class="card mb-3">
      <div class="card-header bg-primary text-white">
        <h3 class="card-title">{{ award.name }} of {{ yearToUse }}</h3>
        <p class="card-text">{{ award.description }}</p>
      </div>
      <div class="card-body">
        <div v-if="award.name === 'The Haberdasher Legacy Award'">
          <draggable v-model="award.seenMovies" class="list-group mb-3" :group="'movies'" handle=".drag-handle" :class="{'dashed-border': award.seenMovies.length === 0}">
            <template #item="{ element, index }">
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <span>{{ index + 1 }}. {{ element.name }}</span>
                <div>
                  <i class="bi bi-x-circle me-2" @click="removeMovieFromList(element, award)"></i>
                  <i class="bi bi-grip-vertical drag-handle" style="cursor: grab;"></i>
                </div>
              </div>
            </template>
          </draggable>
          <div class="legacy-posters" ref="legacyPosters" @scroll="handleScroll">
            <div class="legacy-award-grid" ref="legacyGrid">
              <div v-for="movie in legacyMovies" :key="movie.id" class="movie-poster" @click="toggleMovieSelection(movie)">
                <img :src="`https://image.tmdb.org/t/p/w200${movie.poster_path}`" :alt="movie.title" :class="{'selected': isSelected(movie)}">
                <div v-if="isSelected(movie)" class="checkmark">
                  <i class="bi bi-check-circle-fill"></i>
                </div>
              </div>
            </div>
            <div class="load-more-button d-flex justify-content-center mt-3">
              <button class="btn btn-outline-primary" @click="fetchLegacyMovies" :disabled="currentPage > totalPages">Load More</button>
            </div>
            <div v-if="showScrollIndicator" class="scroll-indicator">
              <i class="bi bi-chevron-down"></i>
            </div>
          </div>
        </div>
        <div v-else>
          <draggable v-model="award.seenMovies" class="list-group" :group="'movies'" handle=".drag-handle" :class="{'dashed-border': award.seenMovies.length === 0}">
            <template #item="{ element, index }">
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <span>{{ index + 1 }}. {{ element.name }}</span>
                <i class="bi bi-grip-vertical drag-handle" style="cursor: grab;"></i>
              </div>
            </template>
            <template #footer>
              <div v-if="award.seenMovies.length === 0" class="list-group-item text-muted text-center">
                Seen Movies
              </div>
            </template>
          </draggable>
          <div class="list-group-item list-group-item-success text-center my-2 p-2">
            <i class="bi bi-arrow-up mx-2"/>
            <i class="bi bi-arrow-up mx-2"/>
            <i class="bi bi-arrow-up mx-2"/>
            <p class="m-0">Drag nominees you have seen up here and rank them.</p>
          </div>
          <draggable v-model="award.nominees" class="list-group" :group="'movies'" handle=".drag-handle">
            <template #item="{ element }">
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <span>{{ element.name }}</span>
                <i class="bi bi-grip-vertical drag-handle" style="cursor: grab;"></i>
              </div>
            </template>
          </draggable>
        </div>
      </div>
    </div>
    <div class="d-flex justify-content-center mt-5">
      <button class="btn btn-success text-light" @click="saveBallot">Save Ballot</button>
    </div>
  </div>
</template>

<script>
import draggable from "vuedraggable";
import axios from "axios";
import { getDatabase, ref, get, set } from "firebase/database";
import { auth } from "../assets/javascript/firebase.js";

const db = getDatabase();

export default {
  name: "Ballot",
  components: {
    draggable,
  },
  data() {
    return {
      awards: [],
      yearToUse: null,
      legacyMovies: [],
      selectedLegacyMovies: [],
      currentPage: 1,
      totalPages: 1,
      observer: null,
      showScrollIndicator: true
    };
  },
  computed: {
    sortedAwards() {
      return [...this.awards].sort((a, b) => a.rank - b.rank);
    },
  },
  watch: {
    awards: {
      handler: 'saveBallot',
      deep: true
    }
  },
  methods: {
    async fetchAwards() {
      const awardsRef = ref(db, "awards");
      const snapshot = await get(awardsRef);
      const awardsData = snapshot.val();
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      this.yearToUse = currentMonth < 4 ? currentYear - 1 : currentYear;

      const user = auth.currentUser;
      if (!user) {
        console.error("User not authenticated");
        return;
      }

      const userKey = `${user.displayName.replace(/\s+/g, '_')}_${user.uid}`;
      const userBallotRef = ref(db, `users/${userKey}/ballot`);
      const userBallotSnapshot = await get(userBallotRef);
      const userBallotData = userBallotSnapshot.val() || {};

      this.awards = awardsData
        ? Object.keys(awardsData).map((key) => {
            const award = awardsData[key];
            const userAwardData = userBallotData[key] || { ranked: [], unseen: [] };
            const rankedSet = new Set(userAwardData.ranked || []);
            return {
              key,
              name: award.name,
              description: award.description,
              rank: award.rank,
              nominees: award.years && award.years[this.yearToUse]
                ? Object.keys(award.years[this.yearToUse].nominees || {}).map(
                    (nomineeKey) => ({
                      name: award.years[this.yearToUse].nominees[nomineeKey].name,
                    })
                  ).filter(nominee => !rankedSet.has(nominee.name))
                : [],
              seenMovies: (userAwardData.ranked || []).map(name => ({ name }))
            };
          })
        : [];

      // Fetch legacy movies for "The Haberdasher Legacy Award"
      await this.fetchLegacyMovies();
    },
    async fetchLegacyMovies() {
      if (this.currentPage > this.totalPages) return;

      try {
        const legacyYear = this.yearToUse - 25;
        const response = await axios.get(`https://api.themoviedb.org/3/discover/movie?api_key=${process.env.VUE_APP_TMDB_API_KEY}&primary_release_year=${legacyYear}&language=en-US&page=${this.currentPage}&sort_by=vote_count.desc`);
        this.legacyMovies = [...this.legacyMovies, ...response.data.results];
        this.totalPages = response.data.total_pages;
        this.currentPage++;
      } catch (error) {
        console.error("Error fetching legacy movies:", error);
      }
    },
    toggleMovieSelection(movie) {
      const index = this.selectedLegacyMovies.findIndex(m => m.id === movie.id);
      if (index === -1) {
        if (this.selectedLegacyMovies.length < 10) {
          this.selectedLegacyMovies.push(movie);
        } else {
          alert("You can only select up to 10 movies.");
        }
      } else {
        this.selectedLegacyMovies.splice(index, 1);
      }
      this.updateLegacyAward();
    },
    isSelected(movie) {
      return this.selectedLegacyMovies.some(m => m.id === movie.id);
    },
    updateLegacyAward() {
      const legacyAward = this.awards.find(award => award.name === "The Haberdasher Legacy Award");
      if (legacyAward) {
        legacyAward.seenMovies = this.selectedLegacyMovies.map(movie => ({ name: movie.title }));
      }
    },
    removeMovieFromList(movie, award) {
      const index = this.selectedLegacyMovies.findIndex(m => m.title === movie.name);
      if (index !== -1) {
        this.selectedLegacyMovies.splice(index, 1);
        this.updateLegacyAward();
      }
      const seenMovieIndex = award.seenMovies.findIndex(m => m.name === movie.name);
      if (seenMovieIndex !== -1) {
        award.seenMovies.splice(seenMovieIndex, 1);
      }
    },
    async saveBallot() {
      const user = auth.currentUser;
      if (!user) {
        console.error("User not authenticated");
        return;
      }

      const userKey = `${user.displayName.replace(/\s+/g, '_')}_${user.uid}`;
      const userBallotRef = ref(db, `users/${userKey}/ballot`);
      const ballotData = this.awards.reduce((acc, award) => {
        acc[award.key] = {
          ranked: award.seenMovies.map((movie) => movie.name),
          unseen: award.nominees.map((nominee) => nominee.name)
        };
        return acc;
      }, {});

      try {
        await set(userBallotRef, ballotData);
        console.log("Ballot saved successfully");
      } catch (error) {
        console.error("Error saving ballot:", error);
      }
    },
    handleScroll() {
      const element = this.$refs.legacyPosters;
      this.showScrollIndicator = element.scrollTop === 0;
    }
  },
  mounted() {
    this.fetchAwards();
  }
};
</script>

<style lang="scss">
@import "@/assets/custom-bootstrap.scss";

.ballot {
  .drag-handle {
    cursor: grab;
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .dashed-border {
    border: 2px dashed #ccc;
  }

  .legacy-posters {
    max-height: 400px;
    overflow-y: auto;
    position: relative;

    .legacy-award-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
      gap: 2px;
    }

    .scroll-indicator {
      animation: bounce 1s infinite;
      background: white;
      border-radius: 500px;
      bottom: 10px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
      color: #0072A3;
      display: flex;
      font-size: 1.5rem;
      height: 32px;
      justify-content: center;
      left: 50%;
      position: absolute;
      transform: translateX(-50%);
      width: 32px;
    }

    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% {
        transform: translateX(-50%) translateY(0);
      }
      40% {
        transform: translateX(-50%) translateY(-10px);
      }
      60% {
        transform: translateX(-50%) translateY(-5px);
      }
    }
  }

  .movie-poster {
    position: relative;
    cursor: pointer;
    border: 2px solid transparent;
  }

  .movie-poster img {
    width: 100%;
    height: auto;
  }

  .movie-poster.selected {
    border-color: $primary;
  }

  .checkmark {
    position: absolute;
    top: 5px;
    right: 5px;
    color: $success;
    font-size: 1.5rem;
  }

  .load-more-trigger {
    height: 1px;
  }
}
</style>