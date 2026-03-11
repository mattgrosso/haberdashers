<template>
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-md-8 col-lg-6">
        <div class="text-center mb-4">
          <h1 class="display-title">The Haberdashers</h1>
          <p class="lead">
            Our annual awards celebrating the best in film.
          </p>
          <p class="description">
            Vote for your favorites across multiple categories and help crown this year's winners.
            Rank your top picks in each category and see how your choices stack up against fellow voters.
          </p>
        </div>
        <div class="card">
          <div class="card-body text-center">
            <p class="mb-3">Sign in to cast your votes</p>
            <div v-if="errorMessage" class="alert alert-warning mb-3">
              {{ errorMessage }}
            </div>
            <button
              class="btn btn-primary btn-block"
              @click="loginWithGoogle"
              :disabled="isLoading"
            >
              <span v-if="isLoading">Signing in...</span>
              <span v-else>Sign in with Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { auth } from "../assets/javascript/firebase.js";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { getDatabase, ref, get, set } from "firebase/database";

const db = getDatabase();

export default {
  name: "Login",
  data () {
    return {
      isLoading: false,
      errorMessage: null
    };
  },
  methods: {
    async loginWithGoogle () {
      this.isLoading = true;
      this.errorMessage = null;

      try {
        // Create a fresh provider instance each time to avoid stale state issues
        const provider = new GoogleAuthProvider();
        // Force account selection to ensure fresh auth flow
        provider.setCustomParameters({
          prompt: 'select_account'
        });

        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        await this.checkAndCreateUser(user);
        this.$router.push("/");
      } catch (error) {
        console.error("Error logging in:", error);

        // Handle specific error cases with user-friendly messages
        if (error.code === 'auth/popup-closed-by-user') {
          this.errorMessage = null; // User closed popup intentionally, no error needed
        } else if (error.code === 'auth/popup-blocked') {
          this.errorMessage = 'Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.';
        } else if (error.code === 'auth/cancelled-popup-request') {
          this.errorMessage = null; // Multiple popup requests, ignore
        } else if (error.message?.includes('missing initial state')) {
          this.errorMessage = 'Sign-in was interrupted. Please try again. If this persists, try clearing your browser cookies or using a different browser.';
        } else {
          this.errorMessage = 'Unable to sign in. Please try again.';
        }
      } finally {
        this.isLoading = false;
      }
    },
    async checkAndCreateUser (user) {
      const userKey = `${user.displayName.replace(/\s+/g, '_')}_${user.uid}`;
      const userRef = ref(db, `users/${userKey}`);
      const userSnap = await get(userRef);

      if (!userSnap.exists()) {
        await set(userRef, {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        });
      }
    },
  },
};
</script>

<style lang="scss">
@import "@/assets/custom-bootstrap.scss";

.container {
  .display-title {
    font-family: 'Engagement', cursive;
    font-size: 3.5rem;
    color: $primary;
  }

  .lead {
    font-size: 1.25rem;
    color: $dark;
  }

  .description {
    color: #666;
  }

  .card {
    border-color: $primary;
  }

  .btn-primary {
    background-color: $primary;
    border-color: $primary;

    &:hover {
      background-color: darken($primary, 10%);
      border-color: darken($primary, 10%);
    }
  }
}
</style>