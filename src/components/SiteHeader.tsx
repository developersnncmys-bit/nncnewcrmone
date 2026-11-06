import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/utils";

/** NNC mark + product name. `dark` = white text for the navy sidebar. */
export function Logo({ href = "/admin", dark = false, sub }: { href?: string; dark?: boolean; sub?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <Image src="/nnc-mark.png" alt="NNC" width={36} height={36} priority className="h-9 w-9" />
      <div className="leading-tight">
        <div className={`text-[17px] font-extrabold tracking-tight ${dark ? "text-white" : "text-navy"}`}>{BRAND}</div>
        {sub && <div className={`text-[11px] font-semibold tracking-wider uppercase ${dark ? "text-slate-400" : "text-slate-500"}`}>{sub}</div>}
      </div>
    </Link>
  );
}
