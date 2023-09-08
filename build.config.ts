import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [{ input: "./src/index" }],
  rollup: {
    emitCJS: true,
  },
  declaration: true,
});
