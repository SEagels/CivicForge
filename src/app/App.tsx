import { AppShell } from "./AppShell";
import { StudyWidget } from "../features/widget/StudyWidget";

export function App() {
  const isWidget = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("widget") === "1";
  return isWidget ? <StudyWidget /> : <AppShell />;
}
