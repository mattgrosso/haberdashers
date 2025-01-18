<template>
  <div>
    <p>Login</p>
    <button @click="loginWithGoogle">Sign in with Google</button>
  </div>
</template>

<script>
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";

export default {
  name: "Login",
  methods: {
    async loginWithGoogle() {
      try {
        await signInWithPopup(auth, googleProvider);
        this.$router.push("/");
      } catch (error) {
        console.error("Error logging in:", error);
      }
    },
  },
};
</script>