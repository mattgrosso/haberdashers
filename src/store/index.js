import { createStore } from 'vuex'
import { getDatabase, ref, get } from 'firebase/database'

const db = getDatabase()

export default createStore({
  state: {
    selectedYear: null,
    availableYears: [],
    yearConfigs: {},
    isLoadingYears: false
  },
  getters: {
    selectedYear: state => state.selectedYear,
    availableYears: state => state.availableYears,
    currentYearConfig: state => state.yearConfigs[state.selectedYear] || {},
    isVotingOpen: state => {
      const config = state.yearConfigs[state.selectedYear]
      return config?.votingOpen || false
    },
    resultsPublished: state => {
      const config = state.yearConfigs[state.selectedYear]
      return config?.resultsPublished || false
    }
  },
  mutations: {
    SET_SELECTED_YEAR (state, year) {
      state.selectedYear = year
      localStorage.setItem('haberdashers_selected_year', year)
    },
    SET_AVAILABLE_YEARS (state, years) {
      state.availableYears = years.sort((a, b) => b - a)
    },
    SET_YEAR_CONFIGS (state, configs) {
      state.yearConfigs = configs
    },
    SET_LOADING_YEARS (state, isLoading) {
      state.isLoadingYears = isLoading
    }
  },
  actions: {
    async initializeYears ({ commit, state }) {
      commit('SET_LOADING_YEARS', true)
      try {
        // Fetch year configurations from Firebase
        const yearConfigRef = ref(db, 'yearConfig')
        const snapshot = await get(yearConfigRef)
        const yearConfig = snapshot.val()

        if (yearConfig && yearConfig.availableYears) {
          const years = yearConfig.availableYears
          commit('SET_AVAILABLE_YEARS', years)

          // Load configs for each year
          const configs = {}
          for (const year of years) {
            if (yearConfig[year]) {
              configs[year] = yearConfig[year]
            }
          }
          commit('SET_YEAR_CONFIGS', configs)

          // Set selected year from localStorage or default to most recent
          const savedYear = localStorage.getItem('haberdashers_selected_year')
          if (savedYear && years.includes(parseInt(savedYear))) {
            commit('SET_SELECTED_YEAR', parseInt(savedYear))
          } else {
            commit('SET_SELECTED_YEAR', years[0])
          }
        } else {
          // Fallback: if no year config exists, use current year - 1
          const fallbackYear = new Date().getFullYear() - 1
          commit('SET_AVAILABLE_YEARS', [fallbackYear])
          commit('SET_SELECTED_YEAR', fallbackYear)
        }
      } catch (error) {
        console.error('Error initializing years:', error)
        // Fallback on error
        const fallbackYear = new Date().getFullYear() - 1
        commit('SET_AVAILABLE_YEARS', [fallbackYear])
        commit('SET_SELECTED_YEAR', fallbackYear)
      } finally {
        commit('SET_LOADING_YEARS', false)
      }
    },
    setSelectedYear ({ commit }, year) {
      commit('SET_SELECTED_YEAR', year)
    }
  },
  modules: {
  }
})
