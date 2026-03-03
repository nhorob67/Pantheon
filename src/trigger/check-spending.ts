import { schedules } from "@trigger.dev/sdk";
import { checkAllCustomerSpending } from "@/lib/alerts/spending-check";

export const checkSpending = schedules.task({
  id: "check-spending",
  cron: "0 */4 * * *",
  retry: {
    maxAttempts: 2,
  },
  run: async () => {
    const result = await checkAllCustomerSpending();
    return result;
  },
});
