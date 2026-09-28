import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <section className="py-10">
      <h1 className="text-2xl font-semibold">This page is not here.</h1>
      <Button className="mt-5" asChild>
        <Link href="/">Back to inbox</Link>
      </Button>
    </section>
  );
}
