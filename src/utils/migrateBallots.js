import { getDatabase, ref, get, set } from 'firebase/database';

const db = getDatabase();

/**
 * Migrate existing ballots from old structure to year-aware structure
 * Old: users/{userKey}/ballot/{awardKey}
 * New: users/{userKey}/ballots/{year}/{awardKey}
 *
 * @param {number} targetYear - The year to migrate ballots to (e.g., 2024)
 * @param {boolean} dryRun - If true, only log what would be migrated without actually migrating
 */
export async function migrateBallots(targetYear, dryRun = true) {
  console.log(`Starting ballot migration to year ${targetYear}...`);
  console.log(`Dry run mode: ${dryRun}`);

  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    const users = snapshot.val();

    if (!users) {
      console.log('No users found');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    const migrationLog = [];

    for (const [userKey, userData] of Object.entries(users)) {
      // Check if old ballot structure exists
      if (!userData.ballot) {
        skippedCount++;
        migrationLog.push(`Skipped ${userKey}: No old ballot found`);
        continue;
      }

      // Check if new structure already exists
      if (userData.ballots && userData.ballots[targetYear]) {
        skippedCount++;
        migrationLog.push(`Skipped ${userKey}: Already has ${targetYear} ballot`);
        continue;
      }

      // Prepare migration
      const oldBallot = userData.ballot;
      const newPath = `users/${userKey}/ballots/${targetYear}`;

      if (dryRun) {
        console.log(`Would migrate ${userKey}:`);
        console.log(`  From: users/${userKey}/ballot`);
        console.log(`  To: ${newPath}`);
        console.log(`  Awards: ${Object.keys(oldBallot).join(', ')}`);
        migrationLog.push(`Would migrate ${userKey} (${Object.keys(oldBallot).length} awards)`);
      } else {
        // Perform actual migration
        const newBallotRef = ref(db, newPath);
        await set(newBallotRef, oldBallot);
        migratedCount++;
        migrationLog.push(`Migrated ${userKey} (${Object.keys(oldBallot).length} awards)`);
        console.log(`✓ Migrated ${userKey}`);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total users: ${Object.keys(users).length}`);
    console.log(`${dryRun ? 'Would migrate' : 'Migrated'}: ${dryRun ? Object.keys(users).length - skippedCount : migratedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log('\n=== Migration Log ===');
    migrationLog.forEach(log => console.log(log));

    if (dryRun) {
      console.log('\n*** This was a DRY RUN - no changes were made ***');
      console.log('To perform the actual migration, call migrateBallots(year, false)');
    } else {
      console.log('\n*** Migration completed successfully ***');
      console.log('Note: Old ballot structure (users/{userKey}/ballot) is still intact');
      console.log('You can manually delete it after verifying the migration');
    }

    return {
      total: Object.keys(users).length,
      migrated: dryRun ? 0 : migratedCount,
      skipped: skippedCount,
      log: migrationLog
    };
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

/**
 * Verify migration by comparing old and new ballot structures
 */
export async function verifyMigration(targetYear) {
  console.log(`Verifying migration for year ${targetYear}...`);

  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    const users = snapshot.val();

    if (!users) {
      console.log('No users found');
      return;
    }

    let matchCount = 0;
    let mismatchCount = 0;
    const issues = [];

    for (const [userKey, userData] of Object.entries(users)) {
      if (!userData.ballot) continue;

      const oldBallot = userData.ballot;
      const newBallot = userData.ballots?.[targetYear];

      if (!newBallot) {
        issues.push(`${userKey}: No new ballot found for ${targetYear}`);
        mismatchCount++;
        continue;
      }

      // Compare structures
      const oldKeys = Object.keys(oldBallot).sort();
      const newKeys = Object.keys(newBallot).sort();

      if (JSON.stringify(oldKeys) !== JSON.stringify(newKeys)) {
        issues.push(`${userKey}: Different award keys`);
        mismatchCount++;
        continue;
      }

      // Deep compare each award
      let hasIssue = false;
      for (const awardKey of oldKeys) {
        const oldRanked = oldBallot[awardKey].ranked || [];
        const newRanked = newBallot[awardKey].ranked || [];

        if (JSON.stringify(oldRanked) !== JSON.stringify(newRanked)) {
          issues.push(`${userKey}.${awardKey}: Ranked lists don't match`);
          hasIssue = true;
        }
      }

      if (hasIssue) {
        mismatchCount++;
      } else {
        matchCount++;
      }
    }

    console.log('\n=== Verification Summary ===');
    console.log(`Total users with old ballots: ${matchCount + mismatchCount}`);
    console.log(`Matches: ${matchCount}`);
    console.log(`Mismatches: ${mismatchCount}`);

    if (issues.length > 0) {
      console.log('\n=== Issues Found ===');
      issues.forEach(issue => console.log(issue));
    } else {
      console.log('\n✓ All ballots verified successfully!');
    }

    return {
      matches: matchCount,
      mismatches: mismatchCount,
      issues
    };
  } catch (error) {
    console.error('Error during verification:', error);
    throw error;
  }
}

// Example usage (can be called from browser console):
// import { migrateBallots, verifyMigration } from './utils/migrateBallots';
// migrateBallots(2024, true);  // Dry run
// migrateBallots(2024, false); // Actual migration
// verifyMigration(2024);       // Verify migration
