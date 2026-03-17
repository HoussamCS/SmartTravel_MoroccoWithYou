import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        clay: "#9e5f38",
        atlas: "#0f3f52",
        dune: "#f4e7d3",
        olive: "#5f6b3f"
      }
    }
  },
  plugins: []
};

export default config;
