import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#03060a",
        panel: "#0a1118",
        line: "#0f2027",
        teal: "#22f1d3",
        magenta: "#c850ff",
      },
      fontFamily: {
        mono: ['ui-monospace','SFMono-Regular','Menlo','monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
