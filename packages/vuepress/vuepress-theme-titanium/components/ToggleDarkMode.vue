<template>
  <button @click="toggleDarkMode"><svg width="65.961mm" height="65.961mm" version="1.1" viewBox="0 0 65.961 65.961" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(-31.981 -97.831)">
  <path d="m64.961 98.331a32.48 32.48 0 0 0-32.48 32.48 32.48 32.48 0 0 0 32.48 32.481 32.48 32.48 0 0 0 32.481-32.481 32.48 32.48 0 0 0-32.481-32.48zm14.967 14.099a23.717 23.717 0 0 1 8.7504 18.381 23.717 23.717 0 0 1-23.717 23.717 23.717 23.717 0 0 1-16.687-6.8709c5.7853-6.6092 23.432-26.697 31.654-35.227z" stop-color="#000000" style="paint-order:stroke fill markers"/>
  </g>
</svg>
</button>
</template>
<script>
  export default {
    mounted() {
      this.checkDefaultMode();
    },
    methods: {
      checkDefaultMode() {
        var theme, prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
        if (prefersDarkScheme.matches)
          theme = document.documentElement.classList.contains("light") ? "light" : "dark";
        else
          theme = document.documentElement.classList.contains("dark") ? "dark" : "light";

        if (localStorage.getItem("theme")) {
          theme = localStorage.getItem("theme");
        }
        if (theme == "dark") {
          document.documentElement.classList.remove("light");
          document.documentElement.classList.add("dark");
        } else if (theme == "light") {
          document.documentElement.classList.remove("dark");
          document.documentElement.classList.add("light");
        }
      },
      toggleDarkMode() {
        var currentTheme = localStorage.getItem("theme");
        console.log(currentTheme);
        if (currentTheme == "dark") {
          document.documentElement.classList.remove("dark");
          document.documentElement.classList.add("light");
          localStorage.setItem("theme", "light");
        } else if (currentTheme == "light") {
          document.documentElement.classList.remove("light");
          document.documentElement.classList.add("dark");
          localStorage.setItem("theme", "dark");
        }
      }
    }
  }
</script>

<style>
  button  {
    margin-left: 5px;
    padding: 5px 10px;
  }

  button:focus {
    outline: none;
  }

  button svg {
    width: 15px;
    height: 15px;
  }

  .dark button svg {
    fill: white;
  }
</style>
