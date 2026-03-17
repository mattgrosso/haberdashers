<template>
  <div class="ballot-management p-3 mb-5">
    <div class="card">
      <div class="card-header bg-primary text-white">
        <h2 class="card-title text-center">Ballot Management</h2>
      </div>
      <div class="card-body d-flex justify-content-around flex-wrap">
        <div class="year-selector mb-4 col-12">
          <label for="management-year-select" class="form-label">Select Year to Evaluate:</label>
          <select id="management-year-select" v-model="selectedYear" @change="fetchVoterCount" class="form-select">
            <option v-for="year in availableYears" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
        </div>
        <button class="btn btn-primary mb-3 col-12" @click="sendEmailToUsers">Send Email to Users</button>
        <div class="d-flex align-items-center mb-3 col-12">
          <button class="btn btn-secondary me-2 col-12" @click="evaluateBallots" :disabled="!selectedYear">Evaluate {{ voterCount }} Ballots for {{ selectedYear }}</button>
        </div>
        <div v-if="showWinners" class="mb-3 col-12">
          <button class="btn btn-success col-12 text-white" @click="publishResults" :disabled="publishing">
            {{ publishing ? 'Publishing...' : `Publish Results for ${selectedYear}` }}
          </button>
        </div>
        <div v-if="showWinners" class="col-12">
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
import { publishResults as publishResultsFlag } from "../utils/initializeYearConfig";

const db = getDatabase();

export default {
  name: "BallotManagement",
  data () {
    return {
      winners: {},
      awards: {},
      showWinners: false,
      voterCount: 0,
      selectedYear: null,
      publishing: false
    };
  },
  computed: {
    sortedAwards () {
      if (!this.awards) return [];
      return Object.entries(this.awards).sort((a, b) => a[1].rank - b[1].rank);
    },
    availableYears () {
      return this.$store.getters.availableYears;
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
    async runoffBallots (rankedBallots, nominees) {
      let rounds = [];
      let eliminated = new Set();
      let eliminationOrder = [];

      while (true) {
        const remainingCandidates = nominees.filter(nom => !eliminated.has(nom));

        let voteCounts = {};
        remainingCandidates.forEach(nom => { voteCounts[nom] = 0; });
        for (const ballot of rankedBallots) {
          const choice = ballot.find(nom => !eliminated.has(nom));
          if (choice) voteCounts[choice]++;
        }

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

        rounds.push({ votes: { ...voteCounts }, borda: { ...bordaCounts } });

        const activeBallots = rankedBallots.filter(ballot =>
          ballot.some(candidate => !eliminated.has(candidate))
        );
        const totalVotes = activeBallots.length;
        const majority = totalVotes / 2;

        for (const [candidate, count] of Object.entries(voteCounts)) {
          if (count > majority) {
            eliminationOrder.push(...remainingCandidates.filter(c => c !== candidate));
            eliminationOrder.push(candidate);
            return { winner: candidate, rounds, rankedNominees: eliminationOrder.reverse() };
          }
        }

        if (remainingCandidates.length === 2) {
          const [cand1, cand2] = remainingCandidates;
          if (voteCounts[cand1] === voteCounts[cand2]) {
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

        const minVotes = Math.min(...Object.values(voteCounts));
        let candidatesForElimination = Object.entries(voteCounts)
          .filter(([_, count]) => count === minVotes)
          .map(([nom]) => nom);

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

        if (nominees.filter(nom => !eliminated.has(nom)).length === 0) {
          return { winner: "tie", rounds, rankedNominees: eliminationOrder.reverse() };
        }
      }
    },
    async evaluateBallots () {
      if (!this.selectedYear) {
        alert('Please select a year to evaluate');
        return;
      }

      try {
        const usersRef = ref(db, "users");
        const snapshot = await get(usersRef);
        const users = snapshot.val();

        if (!users) return;

        const results = {};
        const categories = new Set();
        let voterCount = 0;

        // Get ballot for the selected year only
        const getUserBallot = (user) => {
          return user.ballots?.[this.selectedYear] || null;
        };

        for (const user of Object.values(users)) {
          const ballot = getUserBallot(user);
          if (!ballot) continue;
          let hasRanked = false;
          for (const category of Object.keys(ballot)) {
            categories.add(category);
            if (ballot[category].ranked && ballot[category].ranked.length > 0) {
              hasRanked = true;
            }
          }
          if (hasRanked) voterCount++;
        }

        for (const category of categories) {
          if (category === 'The_Haberdasher_Legacy_Award') continue;

          const rankedBallots = [];
          const nomineeSet = new Set();

          for (const user of Object.values(users)) {
            const ballot = getUserBallot(user);
            const catInfo = ballot?.[category];
            if (catInfo?.ranked) {
              rankedBallots.push(catInfo.ranked);
              catInfo.ranked.forEach(n => nomineeSet.add(n));
            }
          }

          const nominees = [...nomineeSet];
          if (nominees.length === 0) continue;

          const { winner, rounds, rankedNominees } = await this.runoffBallots(rankedBallots, nominees);

          results[category] = {
            winner,
            rounds,
            rankedNominees,
            ballots: rankedBallots.length
          };
        }

        const legacy = {};
        for (const user of Object.values(users)) {
          const ballot = getUserBallot(user);
          if (ballot?.The_Haberdasher_Legacy_Award?.ranked) {
            ballot.The_Haberdasher_Legacy_Award.ranked.forEach((m, index) => {
              const sanitizedNominee = this.sanitizeKey(m);
              if (legacy[sanitizedNominee]) {
                legacy[sanitizedNominee].ballots++;
                legacy[sanitizedNominee].borda += Math.max(0, 10 - index);
              } else {
                legacy[sanitizedNominee] = { ballots: 1, borda: Math.max(0, 10 - index) };
              }
            });
          }
        }
        results.The_Haberdasher_Legacy_Award = {
          nominees: legacy,
          ballots: Object.values(users).filter(user => {
            const ballot = getUserBallot(user);
            return ballot?.The_Haberdasher_Legacy_Award?.ranked;
          }).length
        };

        const awardsRef = ref(db, "awards");
        const awardsSnap = await get(awardsRef);
        this.awards = awardsSnap.val() || {};

        this.winners = results;
        this.voterCount = voterCount;
        this.showWinners = true;
      } catch (error) {
        console.error("Error evaluating ballots:", error);
      }
    },
    sanitizeResult (result) {
      if (!result || !result.rounds) return result;
      const sanitizedRounds = result.rounds.map(round => {
        const votes = {};
        const borda = {};
        for (const [k, v] of Object.entries(round.votes || {})) {
          votes[this.sanitizeKey(k)] = v;
        }
        for (const [k, v] of Object.entries(round.borda || {})) {
          borda[this.sanitizeKey(k)] = v;
        }
        return { votes, borda };
      });
      return {
        ...result,
        winner: result.winner ? this.sanitizeKey(result.winner) : result.winner,
        rankedNominees: (result.rankedNominees || []).map(n => this.sanitizeKey(n)),
        rounds: sanitizedRounds
      };
    },
    async publishResults () {
      if (!confirm(`Publish results for ${this.selectedYear}? This will make them visible on the Past Results page.`)) return;

      this.publishing = true;
      try {
        for (const [awardKey, result] of Object.entries(this.winners)) {
          const resultsRef = ref(db, `awards/${awardKey}/years/${this.selectedYear}/results`);
          const sanitized = awardKey === 'The_Haberdasher_Legacy_Award' ? result : this.sanitizeResult(result);
          await set(resultsRef, sanitized);
        }

        await publishResultsFlag(this.selectedYear);
        await this.$store.dispatch('initializeYears');

        alert(`Results for ${this.selectedYear} have been published!`);
      } catch (error) {
        console.error("Error publishing results:", error);
        alert("Error publishing results. Check the console for details.");
      } finally {
        this.publishing = false;
      }
    },
    async fetchVoterCount () {
      if (!this.selectedYear) return;

      try {
        const usersRef = ref(db, "users");
        const snapshot = await get(usersRef);
        const users = snapshot.val();

        if (!users) return;

        let voterCount = 0;
        for (const user of Object.values(users)) {
          const ballot = user.ballots?.[this.selectedYear];
          if (!ballot) continue;
          for (const category of Object.keys(ballot)) {
            if (ballot[category].ranked && ballot[category].ranked.length > 0) {
              voterCount++;
              break;
            }
          }
        }

        this.voterCount = voterCount;
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
    if (!this.$store.getters.selectedYear) {
      await this.$store.dispatch('initializeYears');
    }
    this.selectedYear = this.$store.getters.selectedYear;
    await this.fetchVoterCount();
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
