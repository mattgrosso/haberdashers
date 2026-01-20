# Multi-Year Support Setup Guide

This guide explains how to set up and use the new multi-year architecture for the Haberdashers voting application.

## Overview

The application now supports multiple years of awards, allowing you to:
- Vote on different years' awards
- View historical results from any year
- Manage voting windows for each year
- Keep ballot data organized by year

## Architecture Changes

### 1. Year State Management (Vuex Store)
- `src/store/index.js` now manages year state globally
- Available years are fetched from Firebase on app initialization
- Selected year persists in localStorage

### 2. Firebase Data Structure

#### Year Configuration (`yearConfig/`)
```
yearConfig/
├── availableYears: [2024, 2025]
├── 2024/
│   ├── votingOpen: false
│   ├── votingStart: timestamp
│   ├── votingEnd: timestamp
│   ├── resultsPublished: true
│   └── description: "Best of 2023 Movies"
└── 2025/
    ├── votingOpen: true
    ├── votingStart: timestamp
    ├── votingEnd: timestamp
    ├── resultsPublished: false
    └── description: "Best of 2024 Movies"
```

#### Ballot Structure (Year-Aware)
**OLD Structure:**
```
users/{userKey}/ballot/{awardKey}
```

**NEW Structure:**
```
users/{userKey}/ballots/{year}/{awardKey}
```

This allows users to vote on multiple years without overwriting previous ballots.

### 3. Component Updates

#### Results.vue
- Added year selector dropdown
- Fetches results for selected year dynamically
- Syncs with Vuex store

#### Ballot.vue
- Added year selector (only shows years with voting open)
- Reads/writes ballots from year-aware structure
- Falls back to old structure for backward compatibility

#### BallotManagement.vue
- Added year selector for evaluation
- Evaluates ballots for selected year
- Supports both old and new ballot structures

## Setup Instructions

### Step 1: Initialize Year Configuration

1. Build and deploy the application:
```bash
yarn build
yarn deploy
```

2. Log in as an admin user

3. Navigate to `/admin-utilities` in your browser

4. Click "Initialize Year Config" button

This will create the `yearConfig` node in Firebase with default values for 2024 and 2025.

### Step 2: Migrate Existing Ballots

If you have existing ballot data from 2024, you need to migrate it:

1. In `/admin-utilities`, set the "Target Year" to 2024

2. Click "Dry Run" to see what will be migrated (no changes made)

3. Review the output to ensure it looks correct

4. Click "Run Migration" to perform the actual migration

5. Click "Verify Migration" to confirm all data was migrated correctly

**Important Notes:**
- The old ballot structure (`users/{userKey}/ballot`) will NOT be deleted
- Both old and new structures will coexist
- The application reads from the new structure first, then falls back to old if needed

### Step 3: Configure Years

You can manually update year configurations in Firebase:

1. Go to Firebase Console > Realtime Database
2. Navigate to `yearConfig/`
3. Edit year settings:
   - `votingOpen`: Set to `true` to allow voting for that year
   - `votingStart`/`votingEnd`: Unix timestamps for voting window
   - `resultsPublished`: Set to `true` when results are ready to view
   - `description`: User-friendly description

### Step 4: Add New Years

To add a new year (e.g., 2026):

#### Option A: Using Admin Utilities (Recommended)
1. In `/admin-utilities`, you can add utility code to call `addYear(2026)`
2. Or manually add via Firebase Console (see Option B)

#### Option B: Manual Firebase Console
1. Go to `yearConfig/availableYears`
2. Add `2026` to the array
3. Create new node `yearConfig/2026/` with:
```json
{
  "votingOpen": false,
  "votingStart": null,
  "votingEnd": null,
  "resultsPublished": false,
  "description": "Best of 2025 Movies"
}
```

## How It Works

### For Voters

1. **Ballot Page**: Users see a year selector showing only years with voting open
2. They can switch between years to vote on different awards
3. Each year's ballot is saved independently

### For Admins

1. **Awards Config**: Admins can manage nominees for all years
2. **Ballot Management**: Select a year to evaluate ballots and calculate winners
3. **Admin Utilities**: Tools to manage year configurations and migrate data

### For Everyone

1. **Results Page**: Anyone can select a year to view results
2. Historical results remain accessible
3. Year selection persists across page navigation

## Important Notes

### Backward Compatibility

The application maintains backward compatibility:
- Old ballot structure (`users/{userKey}/ballot`) still works
- Components check new structure first, then fall back to old
- No immediate action required for existing data

### Data Migration

- Migration is **optional** but recommended
- Old data is not deleted during migration
- You can verify migration before relying on it
- Migration can be run multiple times safely (skips already-migrated users)

### Voting Windows

The Ballot component only shows years where `votingOpen: true` in the year config. This prevents users from voting on closed years.

### Results Publication

Set `resultsPublished: true` for a year to indicate results are final. This can be used in the UI to show badges or notifications.

## Troubleshooting

### "No years available" error
- Check that `yearConfig` exists in Firebase
- Verify `availableYears` array is not empty
- Run "Initialize Year Config" from `/admin-utilities`

### Ballots not showing for a year
- Verify ballots exist at `users/{userKey}/ballots/{year}`
- Run migration if ballots are still in old structure
- Check console for errors

### Can't vote on a specific year
- Verify `yearConfig/{year}/votingOpen` is `true`
- Check that the year is in `availableYears` array

### Results showing empty
- Ensure you've evaluated ballots for that year (BallotManagement)
- Check that results exist at `awards/{awardKey}/years/{year}/results`
- Verify data exists for the selected year in Firebase

## Files Changed/Added

### Added Files:
- `src/utils/initializeYearConfig.js` - Year config initialization
- `src/utils/migrateBallots.js` - Ballot migration utilities
- `src/views/AdminUtilities.vue` - Admin tools UI
- `MULTI_YEAR_SETUP.md` - This documentation

### Modified Files:
- `src/store/index.js` - Added year state management
- `src/views/Results.vue` - Added year selector and dynamic fetching
- `src/components/Ballot.vue` - Year-aware ballot reading/writing
- `src/views/BallotManagement.vue` - Year selection for evaluation
- `src/router/index.js` - Added admin utilities route

## Future Enhancements

Potential improvements to consider:
- Bulk copy nominees from one year to another
- Archive old years to reduce clutter
- Year-over-year comparison views
- Automated voting window management
- Email notifications when voting opens/closes
