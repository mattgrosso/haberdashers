<template>
  <div class="ballot-management p-3 mb-5">
    <div class="card">
      <div class="card-header bg-primary text-white">
        <h2 class="card-title text-center">Ballot Management</h2>
      </div>
      <div class="card-body d-flex justify-content-around flex-wrap">
        <button class="btn btn-primary mb-3" @click="sendEmailToUsers">Send Email to Users</button>
        <button class="btn btn-primary mb-3" @click="evaluateBallots">Evaluate Ballots</button>
        <div v-if="winners.length">
          <h3 class="mt-4">Winners</h3>
          <ul class="list-group">
            <li class="list-group-item" v-for="winner in winners" :key="winner.category">
              <strong>{{ toTitleCase(winner.category) }}:</strong> {{ winner.nominee }}
              <ul class="list-group mt-2">
                <li class="list-group-item" v-for="nominee in winner.nominees" :key="nominee.name" :class="{'list-group-item-success': nominee.name === winner.nominee}">
                  {{ nominee.name }} - {{ nominee.score }} points
                </li>
              </ul>
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
  name: "BallotManagement",
  data() {
    return {
      winners: []
    };
  },
  methods: {
    async sendEmailToUsers() {
      const usersRef = ref(db, "users");
      const snapshot = await get(usersRef);
      const usersData = snapshot.val();

      if (usersData) {
        const emails = Object.values(usersData).map(user => user.email).join(',');
        const subject = encodeURIComponent("Hello from Haberdashers");
        const body = encodeURIComponent("Hello,\n\nThis is a test email from Haberdashers.\n\nBest regards,\nHaberdashers Team");
        const mailtoLink = `mailto:?bcc=${emails}&subject=${subject}&body=${body}`;
        window.open(mailtoLink, '_blank');
      } else {
        alert("No users found.");
      }
    },
    async evaluateBallots() {
      const ballotsRef = ref(db, "users");
      const snapshot = await get(ballotsRef);
      const ballotsData = snapshot.val();

      if (ballotsData) {
        const categoryResults = {};

        // Iterate over each user's ballot
        Object.values(ballotsData).forEach(user => {
          Object.entries(user.ballot || {}).forEach(([category, ballot]) => {
            if (!categoryResults[category]) {
              categoryResults[category] = {};
            }
            // Normalize points based on the number of ranked nominees
            const totalRanked = (ballot.ranked || []).length;
            (ballot.ranked || []).forEach((nominee, index) => {
              if (!categoryResults[category][nominee]) {
                categoryResults[category][nominee] = 0;
              }
              // Add normalized points
              categoryResults[category][nominee] += (totalRanked - index) / totalRanked;
            });
          });
        });

        // Determine the winner for each category and include all nominees' scores
        this.winners = Object.entries(categoryResults).map(([category, nominees]) => {
          const sortedNominees = Object.entries(nominees).sort((a, b) => b[1] - a[1]).map(([name, score]) => ({ name, score }));
          return {
            category,
            nominee: sortedNominees[0].name,
            nominees: sortedNominees
          };
        });

        console.log("Winners:", this.winners);
      } else {
        alert("No ballots found.");
      }
    },
    toTitleCase(str) {
      return str
        .toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }
};
</script>

<style lang="scss">
@import "@/assets/custom-bootstrap.scss";

.ballot-management {
  max-width: 800px;
  margin: 0 auto;

  .card-header {
    background-color: $primary;
    color: white;
  }

  .btn-primary {
    background-color: $primary;
    border-color: $primary;

    &:hover {
      background-color: darken($primary, 10%);
      border-color: darken($primary, 10%);
    }
  }

  .list-group-item-success {
    background-color: $success !important;
    color: white !important;
  }
}
</style>
