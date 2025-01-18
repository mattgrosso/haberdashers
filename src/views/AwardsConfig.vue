<template>
  <div class="awards-config p-3 mb-5">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title text-center">Award Categories</h2>
      </div>
      <ul class="list-group list-group-flush">
        <li class="list-group-item" v-for="award in awards" :key="award.key">
          <h3>{{ award.name }}</h3>
          <p>{{ award.description }}</p>
          <ul class="list-group list-group-flush">
            <li class="list-group-item" v-for="(year, index) in sortYears(award.years)" :key="index">
              <div @click="toggleYearCollapse(year)" role="button" class="d-flex justify-content-between align-items-center">
                <p class="m-0">The {{year.year}} nominees:</p>
                <i :class="!year.isOpen ? 'bi bi-plus' : 'bi bi-dash'"></i>
              </div>
              <div v-if="year.isOpen">
                <ol class="list-group list-group-numbered my-2">
                  <li class="list-group-item" v-for="(nominee, index) in alphabetizedNominees(year.nominees)" :key="index">
                    {{nominee.name}}
                  </li>
                </ol>
                <div class="d-flex justify-content-end">
                  <button class="btn btn-success btn-sm" @click="toggleNomineeInput(award, year)">
                    <span>Add Nominee for {{ year.year }}</span>
                  </button>
                </div>
                <div v-if="year.showNomineeInput" class="input-group my-3 d-flex justify-content-end">
                  <input :ref="`${award.name}-${year.year}-newNominee`" type="text" class="form-control-sm" placeholder="Add Nominee">
                  <button class="btn btn-secondary btn-sm" @click="addNomineeTo(award, year.year)">Add Nominee</button>
                </div>
              </div>
            </li>
          </ul>
          <div class="d-flex justify-content-end">
            <button class="btn btn-success btn-sm" @click="toggleYearInput(award)">
              <span>Add Year for {{ award.name }}</span>
            </button>
          </div>
          <div v-if="award.showYearInput" class="input-group my-3">
            <input :ref="`${award.name}-newYearInput`" type="text" class="form-control form-control-sm" placeholder="Add Year">
            <button class="btn btn-secondary btn-sm" @click="addYearTo(award)">Add Year</button>
          </div>
        </li>
      </ul>
    </div>
    <div class="d-flex justify-content-start mt-3">
      <button class="btn btn-primary" @click="toggleCategoryForm">
        <span v-if="showCategoryForm">Hide Form</span>
        <span v-else>Add Category</span>
      </button>
    </div>
    <div v-if="showCategoryForm" class="card mt-3">
      <div class="card-body">
        <h5 class="card-title text-center">Add New Award Category</h5>
        <form>
          <div class="mb-3">
            <label for="newAwardName" class="form-label">Award Name</label>
            <input type="text" class="form-control" id="newAwardName" v-model="newAwardName">
          </div>
          <div class="mb-3">
            <label for="newAwardDescription" class="form-label">Award Description</label>
            <textarea class="form-control" id="newAwardDescription" v-model="newAwardDescription"></textarea>
          </div>
          <button type="submit" class="btn btn-primary btn-block" @click.prevent="saveAward">Create Award</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { getDatabase, ref, get, set, onValue } from "firebase/database";

const db = getDatabase();

export default {
  name: "AwardsConfig",
  data() {
    return {
      newAwardName: "",
      newAwardDescription: "",
      awards: [],
      showCategoryForm: false,
    };
  },
  methods: {
    async saveAward() {
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
          });
          this.newAwardName = "";
          this.newAwardDescription = "";
          this.showCategoryForm = false;
        }
      } catch (error) {
        console.error("Error creating award:", error);
      }
    },
    fetchAwards() {
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
          years: awardsData[key].years ? Object.keys(awardsData[key].years).map((year) => ({
            year,
            nominees: awardsData[key].years[year].nominees || [],
            showNomineeInput: false,
            isOpen: parseInt(year) === parseInt(previousYear) && parseInt(currentMonth) < 4
          })) : []
        })) : [];
      });
    },
    toggleYearInput(award) {
      award.showYearInput = !award.showYearInput;
    },
    async addYearTo(award) {
      let yearInput = this.$refs[`${award.name}-newYearInput`][0];
      let year = yearInput.value;
      if (year) {
        const awardRef = ref(db, `awards/${award.key}/years/${year}`);
        await set(awardRef, { year: year, nominees: [] });
        this.fetchAwards();
      }
      yearInput.value = "";
    },
    toggleNomineeInput(award, year) {
      year.showNomineeInput = !year.showNomineeInput;
    },
    async addNomineeTo(award, year) {
      let nomineeInput = this.$refs[`${award.name}-${year}-newNominee`][0];
      let nominee = nomineeInput.value;
      if (nominee) {
        const awardRef = ref(db, `awards/${award.key}/years/${year}/nominees/${nominee}`);
        await set(awardRef, {
          name: nominee
        });
        this.fetchAwards();
      }
      nomineeInput.value = "";
    },
    sortYears (years) {
      return years.sort((a, b) => {
        return b.year - a.year;
      });
    },
    alphabetizedNominees (nominees) {
      const nomineesArray = Object.keys(nominees).map(key => ({
        ...nominees[key]
      }));

      const sorted = nomineesArray.sort((a, b) => {
        if (a.name < b.name) {
          return -1;
        }
        if (a.name > b.name) {
          return 1;
        }
        return 0;
      });

      return sorted;
    },
    toggleCategoryForm() {
      this.showCategoryForm = !this.showCategoryForm;
    },
    toggleYearCollapse(year) {
      year.isOpen = !year.isOpen;
    }
  },
  created() {
    this.fetchAwards();
  }
};
</script>

<style lang="scss">

</style>