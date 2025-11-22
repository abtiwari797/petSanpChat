import { readdirSync } from "fs";
import path from "path";
import { runSeedFileOnce } from "../utils/seedHelper";

const SEEDS_DIR = __dirname;

/**
 * Automatically loads and runs all seed files in this folder
 */
export async function runAllSeeds() {
  const seedFiles = readdirSync(SEEDS_DIR)
    .filter((file) => file.endsWith(".ts") && file !== "index.ts");

  for (const file of seedFiles) {
    try {
      const seedPath = path.join(SEEDS_DIR, file);
      const module = await import(seedPath);

      // Expect each seed file to export a default async function OR named function
      const seedFunction = module.default || Object.values(module)[0];

      if (typeof seedFunction !== "function") {
        console.warn(`⚠️ No valid seed function exported in ${file}`);
        continue;
      }

      await runSeedFileOnce(file.replace(".ts", ""), seedFunction);
    } catch (err) {
      console.error(`❌ Error running seed file ${file}:`, err);
    }
  }
}
