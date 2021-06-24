import ts from "@rollup/plugin-typescript"

export default [
  {
    input: "./src/index.ts",
    plugins: [ts()],
    output: {
      file: "./dist/react.js",
      name: "react",
      format: "iife"
    },
  }
]