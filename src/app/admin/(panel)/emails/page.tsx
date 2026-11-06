import { Badge, Empty, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { EmailLog } from "@/lib/models";
import { fmtDateTime } from "@/lib/utils";

export const metadata = { title: "Email log" };

export default async function AdminEmails() {
  await db();
  const list = await EmailLog.find().sort({ createdAt: -1 }).limit(300).lean();
  const smtp = !!process.env.SMTP_HOST;
  return (
    <>
      <PageHeader
        title="Email log"
        subtitle={
          smtp
            ? "Every reminder, invoice and welcome email sent by the system."
            : "SMTP is not configured — emails are only logged here. Add SMTP settings in .env.local to send real emails."
        }
      />
      {list.length === 0 ? (
        <Empty title="No emails yet" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Time</th>
                <th className="th">Type</th>
                <th className="th">To</th>
                <th className="th">Subject</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={String(e._id)}>
                  <td className="td text-xs">{fmtDateTime(e.createdAt)}</td>
                  <td className="td">
                    <Badge>{e.type}</Badge>
                  </td>
                  <td className="td">{e.to}</td>
                  <td className="td whitespace-normal">{e.subject}</td>
                  <td className="td">
                    <Badge tone={e.status === "sent" ? "green" : e.status === "failed" ? "red" : "amber"}>{e.status}</Badge>
                    {e.error && <div className="mt-1 max-w-xs text-xs whitespace-normal text-rose-600">{e.error}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
