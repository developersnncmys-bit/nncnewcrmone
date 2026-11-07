import { notFound } from "next/navigation";
import { addMember, removeMember } from "@/app/actions/team";
import { ConfirmButton, TeamForm } from "@/components/client-bits";
import { Badge, PageHeader } from "@/components/ui";
import { userById } from "@/lib/demo-data";
import { getPlan } from "@/lib/plans";
import { canManage, getUsableWorkspace } from "@/lib/workspace";

export const metadata = { title: "Team" };

export default async function TeamPage({ params }: { params: Promise<{ sub: string }> }) {
  const { sub } = await params;
  const { ws, role } = await getUsableWorkspace(sub);
  if (!canManage(role)) notFound();
  const plan = getPlan(ws.product, ws.plan.tier);
  const byId = { get: (id: string) => userById(id) };
  const owner = userById(ws.owner);
  const used = ws.members.length + 1;

  return (
    <>
      <PageHeader title="Team" subtitle={`${used} of ${plan?.maxUsers ?? "?"} users on your ${plan?.name ?? ""} plan`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Name</th>
                <th className="th">Role</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="td">
                  <div className="font-medium">{owner?.name}</div>
                  <div className="text-xs text-slate-500">{owner?.email}</div>
                </td>
                <td className="td">
                  <Badge tone="indigo">Owner</Badge>
                </td>
                <td className="td"></td>
              </tr>
              {ws.members.map((m) => {
                const u = byId.get(String(m.user));
                return (
                  <tr key={String(m.user)}>
                    <td className="td">
                      <div className="font-medium">{u?.name ?? "Unknown"}</div>
                      <div className="text-xs text-slate-500">{u?.email}</div>
                    </td>
                    <td className="td">
                      <Badge tone={m.role === "admin" ? "blue" : "slate"}>{m.role === "admin" ? "Admin" : "Member"}</Badge>
                    </td>
                    <td className="td text-right">
                      <form action={removeMember.bind(null, sub, String(m.user))}>
                        <ConfirmButton message="Remove this member?" className="btn btn-sm text-rose-600 hover:bg-rose-50">
                          Remove
                        </ConfirmButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        <section className="card p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Add a team member</h2>
          <TeamForm action={addMember.bind(null, sub)} />
        </section>
      </div>
    </>
  );
}
