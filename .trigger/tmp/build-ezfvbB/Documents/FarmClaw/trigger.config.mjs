import {
  defineConfig
} from "../../chunk-OGNGFKGT.mjs";
import "../../chunk-WWNEOE5T.mjs";
import "../../chunk-RLLQVKNR.mjs";
import {
  init_esm
} from "../../chunk-262SQFPS.mjs";

// trigger.config.ts
init_esm();
var trigger_config_default = defineConfig({
  project: process.env.TRIGGER_PROJECT_REF,
  dirs: ["./src/trigger"],
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1e3,
      maxTimeoutInMs: 1e4,
      factor: 2,
      randomize: true
    }
  },
  maxDuration: 120,
  build: {}
});
var resolveEnvVars = void 0;
export {
  trigger_config_default as default,
  resolveEnvVars
};
//# sourceMappingURL=trigger.config.mjs.map
