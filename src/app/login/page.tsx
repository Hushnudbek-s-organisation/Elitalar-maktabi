import { redirect } from "next/navigation";

// Keep old bookmarks working, but use the same real sign-in page as the root route.
export default function LoginAliasPage(): never {
  redirect("/");
}
