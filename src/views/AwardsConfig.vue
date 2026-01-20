<template>
  <div class="awards-config p-3 mb-5">
    <div class="card">
      <div class="card-header bg-primary text-white">
        <h2 class="card-title text-center">Award Categories</h2>
      </div>
      <ul class="list-group list-group-flush">
        <li class="list-group-item" v-for="award in awards" :key="award.key">
          <div class="d-flex flex-wrap">
            <div class="name-and-description col-10">
              <h3>{{ award.name }}</h3>
              <p class="m-0">{{ award.description }}</p>
            </div>
            <div class="edit-buttons col-2">
              <div class="d-flex justify-content-end">
                <button class="btn btn-link btn-sm" @click="toggleYearInput(award)">
                  <i class="bi bi-plus"/>
                </button>
                <button class="btn btn-link btn-sm" @click="editCategory(award)">
                  <i class="bi bi-pencil"></i>
                </button>
              </div>
            </div>
            <div v-if="award.showYearInput" class="input-group my-3 col-12">
              <input :ref="`${award.name}-newYearInput`" type="text" class="form-control form-control-sm" placeholder="Add Year">
              <button class="btn btn-secondary btn-sm" @click="addYearTo(award)">Add Year</button>
            </div>
          </div>
          <ul class="list-group list-group-flush">
            <li class="list-group-item" v-for="(year, index) in sortYears(award.years)" :key="index">
              <div @click="toggleYearCollapse(year)" role="button" class="d-flex justify-content-between align-items-center">
                <p class="m-0">The {{year.year}} nominees:</p>
                <i :class="!year.isOpen ? 'bi bi-plus' : 'bi bi-dash'"></i>
              </div>
              <div v-if="year.isOpen">
                <ol class="list-group list-group-numbered my-2">
                  <li class="list-group-item d-flex justify-content-between align-items-center" v-for="(nominee, index) in year.nominees" :key="index" :class="{'flash-green': nominee.isNew}">
                    <span v-if="!nominee.isEditing">{{nominee.name}}</span>
                    <input
                      v-else
                      v-model="nominee.editName"
                      type="text"
                      class="form-control form-control-sm"
                      @keyup.enter="saveNomineeEdit(award, year.year, nominee)"
                      @keyup.esc="cancelNomineeEdit(nominee)"
                      :ref="`edit-${award.key}-${year.year}-${index}`"
                    >
                    <div>
                      <button v-if="!nominee.isEditing" class="btn btn-link btn-sm text-primary" @click="startEditNominee(award, year, nominee, index)">
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button v-if="nominee.isEditing" class="btn btn-link btn-sm text-success" @click="saveNomineeEdit(award, year.year, nominee)">
                        <i class="bi bi-check-lg"></i>
                      </button>
                      <button v-if="nominee.isEditing" class="btn btn-link btn-sm text-secondary" @click="cancelNomineeEdit(nominee)">
                        <i class="bi bi-x-lg"></i>
                      </button>
                      <button v-if="!nominee.isEditing" class="btn btn-link btn-sm text-danger" @click="removeNominee(award, year.year, nominee.name)">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </li>
                </ol>
                <div class="d-flex justify-content-end mt-2 my-4">
                  <button class="btn btn-outline-success btn-sm mr-3" @click="toggleNomineeInput(year, award)">
                    <span>add nominee</span>
                  </button>
                  <button v-if="year.nominees.length" class="btn btn-outline-secondary btn-sm ms-2" @click="alphabetizeNominees(year)">
                    <span>alphabetize nominees</span>
                  </button>
                </div>
                <div v-if="year.showNomineeInput" class="input-group my-3 d-flex justify-content-end">
                  <input v-model="year.newNominee" :ref="`${award.name}-${year.year}-newNominee`" type="text" class="form-control-sm" placeholder="Add Nominee" @keyup.enter="addNomineeTo(award, year)">
                  <button class="btn btn-secondary btn-sm" @click="addNomineeTo(award, year)">Add Nominee</button>
                </div>
              </div>
            </li>
          </ul>
        </li>
      </ul>
    </div>
    <div class="card my-4">
      <div class="card-header bg-primary text-white">
        <h2 class="card-title text-center">Category Order on Ballot</h2>
      </div>
      <div class="card-body">
        <draggable v-model="awards" @end="updateCategoryOrder" class="list-group">
          <template #item="{ element }">
            <div class="list-group-item d-flex justify-content-between align-items-center">
              <span>{{ element.name }}</span>
              <i class="bi bi-grip-vertical"></i>
            </div>
          </template>
        </draggable>
      </div>
    </div>
    <div class="d-flex justify-content-start mt-3">
      <button class="btn" :class="{'btn-primary': !showCategoryForm, 'btn-warning': showCategoryForm}" @click="toggleCategoryForm">
        <span v-if="showCategoryForm">{{ isEditing ? 'Cancel Edit' : 'Hide Form' }}</span>
        <span v-else>Add Category</span>
      </button>
    </div>
    <div v-if="showCategoryForm" class="card mt-3" ref="categoryForm">
      <div class="card-body">
        <h5 class="card-title text-center">{{ isEditing ? 'Edit Award Category' : 'Add New Award Category' }}</h5>
        <form>
          <div class="mb-3">
            <label for="newAwardName" class="form-label">Award Name</label>
            <input type="text" class="form-control" id="newAwardName" v-model="newAwardName">
          </div>
          <div class="mb-3">
            <label for="newAwardDescription" class="form-label">Award Description</label>
            <textarea class="form-control" id="newAwardDescription" v-model="newAwardDescription"></textarea>
          </div>
          <button type="submit" class="btn btn-primary btn-block" @click.prevent="isEditing ? updateAward() : saveAward()">
            {{ isEditing ? 'Update Award' : 'Create Award' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import draggable from "vuedraggable";
import { getDatabase, ref, get, set, update, onValue, remove } from "firebase/database";

const db = getDatabase();

export default {
  name: "AwardsConfig",
  components: {
    draggable,
  },
  data () {
    return {
      newAwardName: "",
      newAwardDescription: "",
      awards: [],
      showCategoryForm: false,
      isEditing: false,
      editingAwardKey: null,
      scrollPosition: 0,
      previousNominees: {}, // Track nominees from previous fetch to detect new additions
    };
  },
  methods: {
    async saveAward () {
      try {
        const awardKey = this.newAwardName.replace(/\s+/g, '_');
        const awardRef = ref(db, `awards/${awardKey}`);
        const awardSnap = await get(awardRef);

        if (awardSnap.exists()) {
          console.log("Award already exists!");
        } else {
          await set(awardRef, {
            name: this.newAwardName,
            description: this.newAwardDescription,
            rank: this.awards.length // Set the rank to the end of the list
          });
          this.newAwardName = "";
          this.newAwardDescription = "";
          this.showCategoryForm = false;
          this.fetchAwards();
        }
      } catch (error) {
        console.error("Error creating award:", error);
      }
    },
    async updateAward () {
      try {
        const awardRef = ref(db, `awards/${this.editingAwardKey}`);
        await update(awardRef, {
          name: this.newAwardName,
          description: this.newAwardDescription
        });
        this.newAwardName = "";
        this.newAwardDescription = "";
        this.showCategoryForm = false;
        this.isEditing = false;
        this.editingAwardKey = null;
        this.fetchAwards();
        window.scrollTo(0, this.scrollPosition);
      } catch (error) {
        console.error("Error updating award:", error);
      }
    },
    fetchAwards () {
      const awardsRef = ref(db, 'awards');
      onValue(awardsRef, (snapshot) => {
        const awardsData = snapshot.val();
        const currentYear = new Date().getFullYear();
        const previousYear = currentYear - 1;
        const currentMonth = new Date().getMonth() + 1;
        this.awards = awardsData ? Object.keys(awardsData).map((key) => ({
          key,
          ...awardsData[key],
          showYearInput: false,
          years: awardsData[key].years ? Object.keys(awardsData[key].years).map((year) => {
            // Build unique key for this award/year combination
            const trackingKey = `${key}_${year}`;
            const currentNominees = awardsData[key].years[year].nominees
              ? Object.values(awardsData[key].years[year].nominees)
              : [];

            // Get previous nominee names for this award/year
            const previousNomineeNames = this.previousNominees[trackingKey] || [];

            // Map nominees and check if they're new
            const nominees = currentNominees.map(n => {
              const isNew = !previousNomineeNames.includes(n.name);
              return {
                ...n,
                isNew: isNew
              };
            });

            // Update previousNominees for next comparison
            this.previousNominees[trackingKey] = currentNominees.map(n => n.name);

            // Clear isNew flag after animation duration
            nominees.forEach(nominee => {
              if (nominee.isNew) {
                setTimeout(() => {
                  nominee.isNew = false;
                }, 1000);
              }
            });

            return {
              year,
              nominees: nominees,
              showNomineeInput: false,
              newNominee: "", // Add local state for new nominee input
              isOpen: parseInt(year) === parseInt(previousYear) && parseInt(currentMonth) < 4
            };
          }) : []
        })).sort((a, b) => a.rank - b.rank) : [];
      });
    },
    toggleYearInput (award) {
      award.showYearInput = !award.showYearInput;
    },
    async addYearTo (award) {
      const yearInput = this.$refs[`${award.name}-newYearInput`][0];
      const year = yearInput.value;
      if (year) {
        const awardRef = ref(db, `awards/${award.key}/years/${year}`);
        await set(awardRef, { year: year, nominees: [] });
        this.fetchAwards();
      }
      yearInput.value = "";
    },
    toggleNomineeInput (year, award) {
      year.showNomineeInput = !year.showNomineeInput;
      if (year.showNomineeInput) {
        this.$nextTick(() => {
          const inputRef = this.$refs[`${award.name}-${year.year}-newNominee`];
          if (inputRef && inputRef[0]) {
            inputRef[0].focus();
          }
        });
      }
    },
    encodeFirebaseKey(str) {
      // Encode special characters that Firebase doesn't allow in keys
      return str
        .replace(/\./g, '%2E')
        .replace(/\$/g, '%24')
        .replace(/#/g, '%23')
        .replace(/\[/g, '%5B')
        .replace(/\]/g, '%5D')
        .replace(/\//g, '%2F');
    },
    decodeFirebaseKey(str) {
      // Decode the encoded characters
      return str
        .replace(/%2E/g, '.')
        .replace(/%24/g, '$')
        .replace(/%23/g, '#')
        .replace(/%5B/g, '[')
        .replace(/%5D/g, ']')
        .replace(/%2F/g, '/');
    },
    async addNomineeTo (award, year) {
      const nominee = year.newNominee;
      if (nominee) {
        const encodedNominee = this.encodeFirebaseKey(nominee);
        const awardRef = ref(db, `awards/${award.key}/years/${year.year}/nominees/${encodedNominee}`);
        await set(awardRef, {
          name: nominee
        });
        year.newNominee = ""; // Clear the local state for new nominee input
        year.showNomineeInput = false; // Hide the input field
        // The isNew flag will be set automatically by fetchAwards() when it detects the new nominee
      }
    },
    async removeNominee (award, year, nominee) {
      try {
        const encodedNominee = this.encodeFirebaseKey(nominee);
        const nomineeRef = ref(db, `awards/${award.key}/years/${year}/nominees/${encodedNominee}`);
        await remove(nomineeRef);
        this.fetchAwards();
      } catch (error) {
        console.error("Error removing nominee:", error);
      }
    },
    startEditNominee (award, year, nominee, index) {
      // Set all other nominees to not editing
      year.nominees.forEach(n => {
        n.isEditing = false;
      });
      // Start editing this nominee
      nominee.isEditing = true;
      nominee.editName = nominee.name;
      // Focus the input field
      this.$nextTick(() => {
        const inputRef = this.$refs[`edit-${award.key}-${year.year}-${index}`];
        if (inputRef && inputRef[0]) {
          inputRef[0].focus();
          inputRef[0].select();
        }
      });
    },
    async saveNomineeEdit (award, year, nominee) {
      if (!nominee.editName || nominee.editName.trim() === '') {
        alert('Nominee name cannot be empty');
        return;
      }

      const oldName = nominee.name;
      const newName = nominee.editName.trim();

      if (oldName === newName) {
        nominee.isEditing = false;
        return;
      }

      try {
        // Encode names for Firebase keys
        const encodedOldName = this.encodeFirebaseKey(oldName);
        const encodedNewName = this.encodeFirebaseKey(newName);

        // Check if new name already exists
        const newNomineeRef = ref(db, `awards/${award.key}/years/${year}/nominees/${encodedNewName}`);
        const newNomineeSnap = await get(newNomineeRef);

        if (newNomineeSnap.exists()) {
          alert('A nominee with this name already exists');
          return;
        }

        // Remove old nominee
        const oldNomineeRef = ref(db, `awards/${award.key}/years/${year}/nominees/${encodedOldName}`);
        await remove(oldNomineeRef);

        // Add new nominee
        await set(newNomineeRef, { name: newName });

        // Update ballots - check both old and new ballot structures
        const usersRef = ref(db, 'users');
        const usersSnap = await get(usersRef);
        const users = usersSnap.val();

        if (users) {
          const updates = {};
          for (const [userKey, userData] of Object.entries(users)) {
            // Check new ballot structure
            if (userData.ballots && userData.ballots[year]) {
              const ballot = userData.ballots[year][award.key];
              if (ballot?.ranked) {
                const rankedIndex = ballot.ranked.indexOf(oldName);
                if (rankedIndex !== -1) {
                  updates[`users/${userKey}/ballots/${year}/${award.key}/ranked/${rankedIndex}`] = newName;
                }
              }
              if (ballot?.unseen) {
                const unseenIndex = ballot.unseen.indexOf(oldName);
                if (unseenIndex !== -1) {
                  updates[`users/${userKey}/ballots/${year}/${award.key}/unseen/${unseenIndex}`] = newName;
                }
              }
            }
            // Check old ballot structure for backward compatibility
            if (userData.ballot) {
              const ballot = userData.ballot[award.key];
              if (ballot?.ranked) {
                const rankedIndex = ballot.ranked.indexOf(oldName);
                if (rankedIndex !== -1) {
                  updates[`users/${userKey}/ballot/${award.key}/ranked/${rankedIndex}`] = newName;
                }
              }
              if (ballot?.unseen) {
                const unseenIndex = ballot.unseen.indexOf(oldName);
                if (unseenIndex !== -1) {
                  updates[`users/${userKey}/ballot/${award.key}/unseen/${unseenIndex}`] = newName;
                }
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            await update(ref(db), updates);
          }
        }

        nominee.isEditing = false;
        this.fetchAwards();
      } catch (error) {
        console.error("Error editing nominee:", error);
        alert('Error updating nominee. Please try again.');
      }
    },
    cancelNomineeEdit (nominee) {
      nominee.isEditing = false;
      nominee.editName = nominee.name;
    },
    editCategory (award) {
      this.newAwardName = award.name;
      this.newAwardDescription = award.description;
      this.showCategoryForm = true;
      this.isEditing = true;
      this.editingAwardKey = award.key;
      this.scrollPosition = window.scrollY;
      this.$nextTick(() => {
        this.$refs.categoryForm.scrollIntoView({ behavior: 'smooth' });
      });
    },
    sortYears (years) {
      return years.sort((a, b) => {
        return b.year - a.year;
      });
    },
    alphabetizeNominees (year) {
      year.nominees.sort((a, b) => a.name.localeCompare(b.name));
    },
    toggleCategoryForm () {
      if (this.isEditing) {
        this.isEditing = false;
        this.editingAwardKey = null;
        this.newAwardName = "";
        this.newAwardDescription = "";
        window.scrollTo(0, this.scrollPosition);
      }
      this.showCategoryForm = !this.showCategoryForm;
    },
    toggleYearCollapse (year) {
      year.isOpen = !year.isOpen;
    },
    async updateCategoryOrder () {
      const updates = {};
      this.awards.forEach((award, index) => {
        updates[`/awards/${award.key}/rank`] = index;
      });
      try {
        await update(ref(db), updates);
      } catch (error) {
        console.error("Error updating category order:", error);
      }
    }
  },
  created () {
    this.fetchAwards();
  }
};
</script>

<style lang="scss">
@import "@/assets/custom-bootstrap.scss";

.awards-config {
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

  .btn-warning {
    background-color: $warning;
    border-color: $warning;

    &:hover {
      background-color: darken($warning, 10%);
      border-color: darken($warning, 10%);
    }
  }

  .flash-green {
    animation: flashGreen 1s ease-in-out;
  }

  @keyframes flashGreen {
    0% {
      background-color: transparent;
    }
    50% {
      background-color: #d4edda;
    }
    100% {
      background-color: transparent;
    }
  }
}
</style>