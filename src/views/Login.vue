<template>
  <div class="container mt-5">
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card">
          <div class="card-body text-center">
            <button class="btn btn-primary btn-block" @click="loginWithGoogle">Sign in with Google</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { auth, googleProvider } from "../assets/javascript/firebase.js";
import { signInWithPopup } from "firebase/auth";
import { getDatabase, ref, get, set } from "firebase/database";

const db = getDatabase();

export default {
  name: "Login",
  methods: {
    async loginWithGoogle () {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        await this.checkAndCreateUser(user);
        this.$router.push("/");
      } catch (error) {
        console.error("Error logging in:", error);
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