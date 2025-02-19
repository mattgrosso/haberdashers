<template>
  <div class="ballot-management p-3 mb-5">
    <div class="card">
      <div class="card-header bg-primary text-white">
        <h2 class="card-title text-center">Ballot Management</h2>
      </div>
      <div class="card-body d-flex justify-content-around flex-wrap">
        <button class="btn btn-primary mb-3 col-12" @click="sendEmailToUsers">Send Email to Users</button>
        <div class="d-flex align-items-center mb-3 col-12">
          <button class="btn btn-secondary me-2 col-12" @click="evaluateBallots">Evaluate {{ voterCount }} Ballots</button>
        </div>
        <div v-if="showWinners">
          <h3 class="mt-4">Winners</h3>
          <ul class="list-group">
            <li class="list-group-item" v-for="award in sortedAwards" :key="award[0]">
              <strong>{{ award[1].name }} ({{ winners[award[0]].ballots }} ballots):</strong>
              <ul class="list-group mt-2">
                <li class="list-group-item" v-for="nominee in sortedNominees(award)" :key="nominee[0]" :class="{'list-group-item-success': nominee[1].rank === 1}">
                  <span v-if="award[0] === 'The_Haberdasher_Legacy_Award'">{{ nominee[0] }} - {{ nominee[1].borda }} points</span>
                  <span v-else>{{ nominee[1].rank }}. {{ nominee[0] }} - {{ nominee[1].score }} points</span>
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
import { getDatabase, ref, get, set } from "firebase/database";

const db = getDatabase();

export default {
  name: "BallotManagement",
  data () {
    return {
      winners: {},
      awards: {},
      showWinners: false,
      voterCount: 0 // Add voterCount to data
    };
  },
  computed: {
    sortedAwards () {
      return Object.entries(this.awards).sort((a, b) => a[1].rank - b[1].rank);
    }
  },
  methods: {
    async sendEmailToUsers () {
      try {
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
      } catch (error) {
        console.error("Error sending email to users:", error);
      }
    },
    sanitizeKey (key) {
      return key.replace(/[.#$/[\]]/g, '_');
    },
    async evaluateBallots () {
      try {
        const usersRef = ref(db, "users");
        const snapshot = await get(usersRef);
        const users = snapshot.val();

        const results = {};
        const categories = new Set();
        let voterCount = 0; // Initialize voterCount

        // Collect all categories and count voters
        for (const user of Object.values(users)) {
          if (!user.ballot) continue;
          let hasRanked = false;
          for (const category of Object.keys(user.ballot)) {
            categories.add(category);
            if (user.ballot[category].ranked && user.ballot[category].ranked.length > 0) {
              hasRanked = true;
            }
          }
          if (hasRanked) {
            voterCount++;
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

          // 3. Assign ranks and scores: ties get the same rank, skip subsequent ranks
          const categoryResult = {};
          let currentRank = 1;
          let numProcessed = 0;
          let previousScore = null;

          for (let i = 0; i < sorted.length; i++) {
            const nominee = sorted[i];
            const sanitizedNominee = this.sanitizeKey(nominee);
            const score = beatsCount[nominee];
            if (previousScore !== null && score < previousScore) {
              currentRank = numProcessed + 1;
            }
            categoryResult[sanitizedNominee] = { rank: currentRank, score: score };
            previousScore = score;
            numProcessed++;
          }

          // Store final ranking and ballot count for this category
          results[category] = {
            nominees: categoryResult,
            ballots: rankedBallots.length // Add ballot count
          };
        }

        const legacy = {};
        for (const user of Object.values(users)) {
          if (user.ballot && user.ballot.The_Haberdasher_Legacy_Award && user.ballot.The_Haberdasher_Legacy_Award.ranked) {
            user.ballot.The_Haberdasher_Legacy_Award.ranked.forEach((m, index) => {
              const sanitizedNominee = this.sanitizeKey(m);
              if (legacy[sanitizedNominee]) {
                legacy[sanitizedNominee].ballots++;
                legacy[sanitizedNominee].borda += Math.max(0, 10 - index);
              } else {
                legacy[sanitizedNominee] = {
                  ballots: 1,
                  borda: Math.max(0, 10 - index)
                }
              }
            })
          }
        }
        results.The_Haberdasher_Legacy_Award = {
          nominees: legacy,
          ballots: Object.values(users).filter(user => user.ballot && user.ballot.The_Haberdasher_Legacy_Award && user.ballot.The_Haberdasher_Legacy_Award.ranked).length // Add ballot count
        };

        const awardsRef = ref(db, "awards");
        const awardsSnap = await get(awardsRef);
        this.awards = awardsSnap.val();

        this.winners = results;
        this.voterCount = voterCount; // Update voterCount
        this.showWinners = true;

        // Save results to the database
        const currentYear = new Date().getFullYear();
        for (const [category, result] of Object.entries(results)) {
          const categoryRef = ref(db, `awards/${category}/years/${currentYear - 1}/results`);
          await set(categoryRef, result);
        }
      } catch (error) {
        console.error("Error evaluating ballots:", error);
      }
    },
    async fetchVoterCount () {
      try {
        const usersRef = ref(db, "users");
        const snapshot = await get(usersRef);
        const users = snapshot.val();

        let voterCount = 0;

        // Count voters
        for (const user of Object.values(users)) {
          if (!user.ballot) continue;
          let hasRanked = false;
          for (const category of Object.keys(user.ballot)) {
            if (user.ballot[category].ranked && user.ballot[category].ranked.length > 0) {
              hasRanked = true;
              break;
            }
          }
          if (hasRanked) {
            voterCount++;
          }
        }

        this.voterCount = voterCount; // Update voterCount
      } catch (error) {
        console.error("Error fetching voter count:", error);
      }
    },
    sortedNominees (award) {
      return Object.entries(this.winners[award[0]].nominees).sort((a, b) => award[0] === 'The_Haberdasher_Legacy_Award' ? b[1].borda - a[1].borda : a[1].rank - b[1].rank);
    },
    toTitleCase (str) {
      return str
        .toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  },
  async mounted () {
    await this.fetchVoterCount(); // Fetch voter count on mount
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
