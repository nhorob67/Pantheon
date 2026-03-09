import { redirect } from "next/navigation";

// Activity is now merged into the Schedules page
export default function ScheduleActivityPage() {
  redirect("/settings/schedules");
}
