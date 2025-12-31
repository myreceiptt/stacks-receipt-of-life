import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const pidPath = path.resolve(
  rootDir,
  "receipt",
  process.env.RECEIPT_PID_FILE ?? ".stamp.pid"
);

const main = async () => {
  try {
    const raw = await fs.readFile(pidPath, "utf8");
    const pid = Number(raw.trim());
    if (!pid) {
      throw new Error("PID file is empty or invalid.");
    }
    process.kill(pid, "SIGTERM");
    await fs.unlink(pidPath);
    console.log(`Stopped stamp process ${pid}`);
  } catch (error) {
    console.error("Unable to stop stamp process", error);
    process.exitCode = 1;
  }
};

main();
