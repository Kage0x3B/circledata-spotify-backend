import cron from "node-cron";
import listeningHistoryCronJob from "./listeningHistoryCronJob.mjs";

export function scheduleCronJobs() {
    cron.schedule("* * * * *", listeningHistoryCronJob);
}
