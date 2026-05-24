import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60dvh] flex flex-col items-center justify-center text-center gap-4">
      <h1 className="text-headline-xl font-semibold tracking-tight">404</h1>
      <p className="text-on-surface-variant text-body-md">Nothing here yet.</p>
      <Link
        href="/"
        className="px-5 py-2 rounded-full bg-white text-black text-label-md font-semibold active:scale-95 transition-transform"
      >
        Back to Studio
      </Link>
    </div>
  );
}
