import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="h-[100dvh] w-full grid place-items-center bg-[color:var(--bg-deep)] px-4">
      <div className="w-[min(380px,100%)] rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] shadow-soft p-7 sm:p-8">
        <div className="font-serif italic text-[34px] leading-none tracking-tight text-[color:var(--ink)]">
          paintoo<span className="text-[color:var(--accent)]">.</span>
        </div>
        <p className="text-[color:var(--ink-3)] text-[13px] mt-2 mb-6">
          A small studio for marks. Sign in to continue.
        </p>
        <LoginForm nextPath={sp.next} />
      </div>
    </div>
  );
}
