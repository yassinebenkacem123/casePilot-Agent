import { redirect } from "next/navigation";
import { hasSession } from "@/lib/session";
import { Workspace } from "@/features/board/workspace";
export default async function BoardPage() {
  if (!(await hasSession())) redirect("/login");
  return <Workspace />;
}
