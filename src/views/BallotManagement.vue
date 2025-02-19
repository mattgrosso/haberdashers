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
      if (!this.awards) return [];
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
    async runoffBallots(rankedBallots, nominees) {
      let rounds = [];
      let eliminated = new Set();
      let eliminationOrder = [];

      while (true) {
        // Identify remaining candidates.
        const remainingCandidates = nominees.filter(nom => !eliminated.has(nom));
        
        // Count first-choice votes.
        let voteCounts = {};
        remainingCandidates.forEach(nom => { voteCounts[nom] = 0; });
        for (const ballot of rankedBallots) {
          const choice = ballot.find(nom => !eliminated.has(nom));
          if (choice) voteCounts[choice]++;
        }
        
        // Compute Borda counts for the remaining candidates in this round.
        let bordaCounts = {};
        remainingCandidates.forEach(nom => { bordaCounts[nom] = 0; });
        for (const ballot of rankedBallots) {
          for (const candidate of remainingCandidates) {
            const idx = ballot.indexOf(candidate);
            if (idx !== -1) {
              bordaCounts[candidate] += (ballot.length - idx);
            }
          }
        }
        
        // Record this round's results.
        rounds.push({ votes: { ...voteCounts }, borda: { ...bordaCounts } });
        
        // Recalculate the active ballots (ballots with any remaining candidate)
        const activeBallots = rankedBallots.filter(ballot =>
          ballot.some(candidate => !eliminated.has(candidate))
        );
        const totalVotes = activeBallots.length;
        const majority = totalVotes / 2;
        
        // Check for a majority winner.
        for (const [candidate, count] of Object.entries(voteCounts)) {
          if (count > majority) {
            eliminationOrder.push(...remainingCandidates.filter(c => c !== candidate));
            eliminationOrder.push(candidate);
            return { winner: candidate, rounds, rankedNominees: eliminationOrder.reverse() };
          }
        }
        
        // Special handling for two candidates left:
        if (remainingCandidates.length === 2) {
          const [cand1, cand2] = remainingCandidates;
          if (voteCounts[cand1] === voteCounts[cand2]) {
            // Use Borda counts to break the tie.
            if (bordaCounts[cand1] > bordaCounts[cand2]) {
              eliminationOrder.push(cand2, cand1);
              return { winner: cand1, rounds, rankedNominees: eliminationOrder.reverse() };
            } else if (bordaCounts[cand2] > bordaCounts[cand1]) {
              eliminationOrder.push(cand1, cand2);
              return { winner: cand2, rounds, rankedNominees: eliminationOrder.reverse() };
            } else {
              eliminationOrder.push(cand1, cand2);
              return { winner: "tie", rounds, rankedNominees: eliminationOrder.reverse() };
            }
          }
        }
        
        // Identify the candidate(s) with the fewest votes.
        const minVotes = Math.min(...Object.values(voteCounts));
        let candidatesForElimination = Object.entries(voteCounts)
          .filter(([_, count]) => count === minVotes)
          .map(([nom]) => nom);
        
        // Use Borda tiebreaker if needed.
        if (candidatesForElimination.length > 1) {
          const bordaTie = {};
          candidatesForElimination.forEach(candidate => {
            bordaTie[candidate] = bordaCounts[candidate];
          });
          const minBorda = Math.min(...Object.values(bordaTie));
          const tiedByBorda = candidatesForElimination.filter(candidate => bordaTie[candidate] === minBorda);
          if (tiedByBorda.length === 1) {
            eliminated.add(tiedByBorda[0]);
            eliminationOrder.push(tiedByBorda[0]);
          } else {
            tiedByBorda.forEach(candidate => {
              eliminated.add(candidate);
              eliminationOrder.push(candidate);
            });
          }
        } else {
          eliminated.add(candidatesForElimination[0]);
          eliminationOrder.push(candidatesForElimination[0]);
        }
        
        // If no candidates remain, it's a tie.
        if (nominees.filter(nom => !eliminated.has(nom)).length === 0) {
          return { winner: "tie", rounds, rankedNominees: eliminationOrder.reverse() };
        }
      }
    },
    async evaluateBallots () {
      try {
        const usersRef = ref(db, "users");
        const snapshot = await get(usersRef);
        const users = snapshot.val();

        if (!users) {
          return;
        }

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

          // Run the instant runoff voting process
          const { winner, rounds, rankedNominees } = await this.runoffBallots(rankedBallots, nominees);

          // Store final ranking and ballot count for this category
          results[category] = {
            winner,
            rounds,
            ballots: rankedBallots.length, // Add ballot count
            rankedNominees // Add ranked nominees
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
        this.awards = awardsSnap.val() || {};

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

        if (!users) {
          console.error("No users found.");
          return;
        }

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
      const nominees = this.winners[award[0]]?.nominees;
      if (!nominees) return [];
      return Object.entries(nominees).sort((a, b) => award[0] === 'The_Haberdasher_Legacy_Award' ? b[1].borda - a[1].borda : a[1].rank - b[1].rank);
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
