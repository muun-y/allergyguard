/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["views/**/*.ejs", "./views/templates/*.ejs"],
  theme: {
    extend: {
      colors: {
        "theme-bg": "#FAFAFA", //bright mode background
        "theme-hover": "#F1F1F1",
        "theme-gray": "#4D4D4D", // bright mode icon
        "theme-border": "#D5D5D5", //bright mode border
      },
    },
  },
  plugins: [],
};
