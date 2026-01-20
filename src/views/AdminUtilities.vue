<template>
  <div class="admin-utilities p-3 mb-5">
    <div class="card mb-4">
      <div class="card-header bg-primary text-white">
        <h2 class="card-title text-center">Admin Utilities</h2>
      </div>
      <div class="card-body">
        <div class="mb-4">
          <h4>Year Configuration</h4>
          <p class="text-muted">Initialize or update year configuration in Firebase</p>
          <button class="btn btn-primary" @click="initializeYearConfig" :disabled="loading">
            {{ loading ? 'Initializing...' : 'Initialize Year Config' }}
          </button>
        </div>

        <hr/>

        <div class="mb-4">
          <h4>Ballot Migration</h4>
          <p class="text-muted">Migrate old ballot structure to year-aware structure</p>
          <div class="mb-3">
            <label for="migration-year" class="form-label">Target Year:</label>
            <input
              id="migration-year"
              type="number"
              v-model.number="migrationYear"
              class="form-control"
              style="max-width: 200px"
              :min="2024"
            />
          </div>
          <div class="btn-group mb-3" role="group">
            <button class="btn btn-secondary" @click="runMigration(true)" :disabled="loading">
              Dry Run
            </button>
            <button class="btn btn-warning" @click="runMigration(false)" :disabled="loading">
              Run Migration
            </button>
            <button class="btn btn-info" @click="verifyMigrationData" :disabled="loading">
              Verify Migration
            </button>
          </div>
        </div>

        <hr/>

        <div class="mb-4">
          <h4>Clear Ballots for Year</h4>
          <p class="text-muted">Remove all ballot data for a specific year (use with caution!)</p>
          <div class="mb-3">
            <label for="clear-year" class="form-label">Year to Clear:</label>
            <input
              id="clear-year"
              type="number"
              v-model.number="clearYear"
              class="form-control"
              style="max-width: 200px"
              :min="2024"
            />
          </div>
          <button class="btn btn-danger" @click="clearBallotsForYear" :disabled="loading">
            Clear All Ballots for {{ clearYear }}
          </button>
        </div>

        <div v-if="output" class="alert alert-info">
          <h5>Output:</h5>
          <pre>{{ output }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { initializeYearConfig } from '../utils/initializeYearConfig';
import { migrateBallots, verifyMigration } from '../utils/migrateBallots';
import { getDatabase, ref, get, remove } from 'firebase/database';

const db = getDatabase();

export default {
  name: 'AdminUtilities',
  data() {
    return {
      migrationYear: 2024,
      clearYear: 2025,
      loading: false,
      output: ''
    };
  },
  methods: {
    async initializeYearConfig() {
      this.loading = true;
      this.output = '';
      try {
        await initializeYearConfig();
        this.output = 'Year configuration initialized successfully!\n\nYou may need to refresh the page for changes to take effect.';
      } catch (error) {
        this.output = `Error: ${error.message}`;
      } finally {
        this.loading = false;
      }
    },
    async runMigration(dryRun) {
      if (!dryRun) {
        const confirmed = confirm(
          `Are you sure you want to migrate ballots to year ${this.migrationYear}?\n\n` +
          `This will copy data from users/{userKey}/ballot to users/{userKey}/ballots/${this.migrationYear}.\n\n` +
          'The old structure will not be deleted.'
        );
        if (!confirmed) return;
      }

      this.loading = true;
      this.output = '';
      try {
        const result = await migrateBallots(this.migrationYear, dryRun);
        this.output = `Migration ${dryRun ? 'Dry Run' : 'Complete'}!\n\n` +
          `Total users: ${result.total}\n` +
          `${dryRun ? 'Would migrate' : 'Migrated'}: ${result.total - result.skipped}\n` +
          `Skipped: ${result.skipped}\n\n` +
          `Log:\n${result.log.join('\n')}`;
      } catch (error) {
        this.output = `Error: ${error.message}`;
      } finally {
        this.loading = false;
      }
    },
    async verifyMigrationData() {
      this.loading = true;
      this.output = '';
      try {
        const result = await verifyMigration(this.migrationYear);
        this.output = `Verification Complete!\n\n` +
          `Matches: ${result.matches}\n` +
          `Mismatches: ${result.mismatches}\n\n` +
          (result.issues.length > 0 ? `Issues:\n${result.issues.join('\n')}` : 'All ballots verified successfully!');
      } catch (error) {
        this.output = `Error: ${error.message}`;
      } finally {
        this.loading = false;
      }
    },
    async clearBallotsForYear() {
      const confirmed = confirm(
        `Are you sure you want to DELETE all ballots for ${this.clearYear}?\n\n` +
        `This will remove users/{userKey}/ballots/${this.clearYear} for ALL users.\n\n` +
        'This action cannot be undone!'
      );
      if (!confirmed) return;

      this.loading = true;
      this.output = '';
      try {
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        const users = snapshot.val();

        if (!users) {
          this.output = 'No users found.';
          return;
        }

        let cleared = 0;
        const log = [];

        for (const [userKey, userData] of Object.entries(users)) {
          if (userData.ballots && userData.ballots[this.clearYear]) {
            const ballotRef = ref(db, `users/${userKey}/ballots/${this.clearYear}`);
            await remove(ballotRef);
            cleared++;
            log.push(`Cleared ballot for: ${userKey}`);
          }
        }

        this.output = `Cleared ${cleared} ballots for year ${this.clearYear}.\n\n` +
          (log.length > 0 ? `Log:\n${log.join('\n')}` : 'No ballots found for this year.');
      } catch (error) {
        this.output = `Error: ${error.message}`;
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.admin-utilities {
  max-width: 800px;
  margin: 0 auto;

  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
    max-height: 400px;
    overflow-y: auto;
  }
}
</style>
