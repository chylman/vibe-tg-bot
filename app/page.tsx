export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSupabaseServer } from "../lib/supabaseServer"; // async
import { SignOutButton } from "./signinout";

// Server Component: fetch messages on the server
export default async function MessagesPage() {
  type Message = {
    id: string | number;
    username: string | null;
    text: string | null;
    created_at: string;
    telegram_chat_id: string | number | null;
  };

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-full flex flex-col items-center px-4 py-10 sm:px-6 lg:px-8">
      <main className="w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">BotAdminPanel — Сообщения</h1>
          <div className="flex items-center gap-3 text-sm text-zinc-600">
            <span>{user.email}</span>
            <SignOutButton />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
            Не удалось загрузить сообщения: {error.message}
          </div>
        )}

        {!error && (!messages || messages.length === 0) && (
          <div className="text-zinc-600">Сообщений пока нет.</div>
        )}

        <div className="space-y-4">
          {messages?.map((m: Message) => {
            const created = new Date(m.created_at);
            const formatted = isNaN(created.getTime())
              ? m.created_at
              : created.toLocaleString("ru-RU", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                });

            return (
              <article
                key={m.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <header className="mb-2 flex items-start justify-between gap-3">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {m.username || "Без имени"}
                  </div>
                  <time className="text-xs text-zinc-500">{formatted}</time>
                </header>
                <p className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                  {m.text || "(пустое сообщение)"}
                </p>
                <footer className="mt-3 text-xs text-zinc-500">
                  Telegram Chat ID: {m.telegram_chat_id ?? "—"}
                </footer>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
