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
      const usersRef = ref(db, "users");
      const snapshot = await get(usersRef);
      const users = snapshot.val();

      const results = {};
      const categories = new Set();

      // Collect all categories
      for (const user of Object.values(users)) {
        if (!user.ballot) continue;
        for (const category of Object.keys(user.ballot)) {
          categories.add(category);
        }
      }

      // Process each category
      for (const category of categories) {
        const rankedBallots = [];
        const nomineeSet = new Set();

        // Gather ranked ballots and all unique nominees
        for (const user of Object.values(users)) {
          const catInfo = user.ballot?.[category];
          if (catInfo?.ranked) {
            rankedBallots.push(catInfo.ranked);
            catInfo.ranked.forEach(n => nomineeSet.add(n));
          }
        }

        const nominees = [...nomineeSet];
        if (nominees.length === 0) continue;

        // Step A: pairwise preferences d(A,B)
        const d = {};
        nominees.forEach(a => {
          d[a] = {};
          nominees.forEach(b => {
            if (a !== b) d[a][b] = 0;
          });
        });

        for (const ballot of rankedBallots) {
          for (let i = 0; i < ballot.length; i++) {
            for (let j = i + 1; j < ballot.length; j++) {
              d[ballot[i]][ballot[j]] += 1;
            }
          }
        }

        // Step B: compute strongest paths D(A,B)
        const D = {};
        nominees.forEach(a => {
          D[a] = {};
          nominees.forEach(b => {
            D[a][b] = 0;
          });
        });

        // If d(A,B) > d(B,A), set D(A,B) = d(A,B)
        nominees.forEach(a => {
          nominees.forEach(b => {
            if (a !== b && d[a][b] > d[b][a]) {
              D[a][b] = d[a][b];
            }
          });
        });

        // Floyd–Warshall-like update
        nominees.forEach(i => {
          nominees.forEach(j => {
            if (i === j) return;
            nominees.forEach(k => {
              if (i === k || j === k) return;
              D[j][k] = Math.max(D[j][k], Math.min(D[j][i], D[i][k]));
            });
          });
        });

        // Step C: build a ranking rather than just picking winners
        // 1. For each nominee, count how many others it "beats"
        //    (i.e., D(a,b) > D(b,a)).
        const beatsCount = {};
        nominees.forEach(a => {
          let count = 0;
          for (const b of nominees) {
            if (b !== a && D[a][b] > D[b][a]) count++;
          }
          beatsCount[a] = count;
        });

        // 2. Sort nominees by descending beatsCount
        const sorted = [...nominees].sort((x, y) => beatsCount[y] - beatsCount[x]);

        // 3. Assign ranks: ties get the same rank, skip subsequent ranks
        const categoryResult = {};
        let currentRank = 1;
        let numProcessed = 0;
        let previousScore = null;

        for (let i = 0; i < sorted.length; i++) {
          const nominee = sorted[i];
          const score = beatsCount[nominee];
          if (previousScore !== null && score < previousScore) {
            currentRank = numProcessed + 1; 
          }
          categoryResult[nominee] = currentRank;
          previousScore = score;
          numProcessed++;
        }

        // Store final ranking for this category
        results[category] = categoryResult;
      }
      console.log(results);
      // return results;
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
