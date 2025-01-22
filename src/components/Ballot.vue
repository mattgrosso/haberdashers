<template>
  <div class="ballot p-3 mb-5">
    <div v-for="award in sortedAwards" :key="award.key" class="card mb-3">
      <div class="card-header bg-primary text-white">
        <h3 class="card-title">{{ award.name }} of {{ yearToUse }}</h3>
        <p class="card-text">{{ award.description }}</p>
      </div>
      <div class="card-body">
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
    <div class="d-flex justify-content-center mt-3">
      <button class="btn btn-success text-light" @click="saveBallot">Save Ballot</button>
    </div>
  </div>
</template>

<script>
import draggable from "vuedraggable";
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
    };
  },
  computed: {
    sortedAwards() {
      return [...this.awards].sort((a, b) => a.rank - b.rank);
    },
  },
  methods: {
    async fetchAwards() {
      const awardsRef = ref(db, "awards");
      const snapshot = await get(awardsRef);
      const awardsData = snapshot.val();
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      this.yearToUse = currentMonth < 4 ? currentYear - 1 : currentYear;

      this.awards = awardsData
        ? Object.keys(awardsData).map((key) => ({
            key,
            name: awardsData[key].name,
            description: awardsData[key].description,
            rank: awardsData[key].rank,
            nominees: awardsData[key].years && awardsData[key].years[this.yearToUse]
              ? Object.keys(awardsData[key].years[this.yearToUse].nominees || {}).map(
                  (nomineeKey) => ({
                    name: awardsData[key].years[this.yearToUse].nominees[nomineeKey].name,
                  })
                )
              : [],
            seenMovies: []
          }))
        : [];
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
  },
  created() {
    this.fetchAwards();
  },
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
}
</style>