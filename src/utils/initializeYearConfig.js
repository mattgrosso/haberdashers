import { getDatabase, ref, set, get } from 'firebase/database';

const db = getDatabase();

/**
 * Initialize year configuration in Firebase
 * Run this once to set up the yearConfig structure
 */
export async function initializeYearConfig() {
  const yearConfigRef = ref(db, 'yearConfig');

  const config = {
    availableYears: [2024, 2025],
    2024: {
      votingOpen: false,
      votingStart: new Date('2024-01-01').getTime(),
      votingEnd: new Date('2024-03-31').getTime(),
      resultsPublished: true,
      description: 'Best of 2023 Movies'
    },
    2025: {
      votingOpen: true,
      votingStart: new Date('2025-01-01').getTime(),
      votingEnd: new Date('2025-03-31').getTime(),
      resultsPublished: false,
      description: 'Best of 2024 Movies'
    }
  };

  try {
    await set(yearConfigRef, config);
    console.log('Year configuration initialized successfully');
    return config;
  } catch (error) {
    console.error('Error initializing year config:', error);
    throw error;
  }
}

/**
 * Add a new year to the configuration
 */
export async function addYear(year, config = {}) {
  const yearRef = ref(db, `yearConfig/${year}`);
  const availableYearsRef = ref(db, 'yearConfig/availableYears');

  const defaultConfig = {
    votingOpen: false,
    votingStart: null,
    votingEnd: null,
    resultsPublished: false,
    description: `Best of ${year - 1} Movies`,
    ...config
  };

  try {
    // Add year config
    await set(yearRef, defaultConfig);

    // Update available years list
    const snapshot = await get(availableYearsRef);
    const currentYears = snapshot.val() || [];
    if (!currentYears.includes(year)) {
      currentYears.push(year);
      currentYears.sort((a, b) => b - a);
      await set(availableYearsRef, currentYears);
    }

    console.log(`Year ${year} added successfully`);
    return defaultConfig;
  } catch (error) {
    console.error(`Error adding year ${year}:`, error);
    throw error;
  }
}

/**
 * Update voting status for a year
 */
export async function updateVotingStatus(year, isOpen) {
  const votingOpenRef = ref(db, `yearConfig/${year}/votingOpen`);

  try {
    await set(votingOpenRef, isOpen);
    console.log(`Voting for year ${year} set to: ${isOpen}`);
  } catch (error) {
    console.error(`Error updating voting status for year ${year}:`, error);
    throw error;
  }
}

/**
 * Publish results for a year
 */
export async function publishResults(year) {
  const resultsPublishedRef = ref(db, `yearConfig/${year}/resultsPublished`);

  try {
    await set(resultsPublishedRef, true);
    console.log(`Results published for year ${year}`);
  } catch (error) {
    console.error(`Error publishing results for year ${year}:`, error);
    throw error;
  }
}
