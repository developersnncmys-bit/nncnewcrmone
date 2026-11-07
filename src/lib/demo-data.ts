// Dummy data for the UI. There is no database: every screen reads from these arrays.
// Dates are relative to "today" so renewals, reminders and charts always look current.
import { PLANS, priceFor } from "./plans";
import { PRODUCTS, type ProductKey } from "./products";
import type { Cycle, EmailLogT, LeadT, PaymentT, RecordT, Session, Tier, UserT, WorkspaceT, WorkspaceStatus } from "./types";
import { DAY, cycleMonths, withGst } from "./utils";

const NOW = Date.now();
const ago = (days: number, hours = 10) => {
  const d = new Date(NOW - days * DAY);
  d.setHours(hours, 0, 0, 0);
  return d;
};
const minusMonths = (d: Date, m: number) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() - m);
  return x;
};
const day = (offset: number) => ago(-offset).toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* Users                                                              */
/* ------------------------------------------------------------------ */
export const ADMIN: UserT = { _id: "u-admin", name: "Admin", email: "admin@nncdigital.co.in", phone: "", role: "superadmin", createdAt: ago(400) };
export const ADMIN_SESSION: Session = { uid: ADMIN._id, role: "superadmin", name: ADMIN.name, email: ADMIN.email };

export const USERS: UserT[] = [ADMIN];
const user = (id: string, name: string, email: string, phone: string): string => {
  USERS.push({ _id: id, name, email, phone, role: "customer", createdAt: ago(300) });
  return id;
};

/* ------------------------------------------------------------------ */
/* Customers (workspaces) + their payments                             */
/* ------------------------------------------------------------------ */
type Seed = {
  id: string;
  company: string;
  sub: string;
  product: ProductKey;
  tier: Tier;
  cycle: Cycle;
  status: WorkspaceStatus;
  owner: [string, string, string]; // name, email, phone
  members?: [string, string, "admin" | "member"][];
  endIn?: number; // days until the current period ends (negative = already ended)
  periods?: number; // paid periods so far
  createdAgo?: number; // only for never-paid (pending) customers
  scheduled?: { tier: Tier; cycle: Cycle };
  gstin?: string;
  state: string;
  address: string;
  notes?: string;
};

const SEEDS: Seed[] = [
  { id: "ws-balaji", company: "Sri Balaji Tours & Travels", sub: "balajitours", product: "travel", tier: "growth", cycle: "yearly", status: "active", owner: ["Ramesh Kumar", "ramesh@balajitours.in", "98450 12345"], members: [["Divya S", "divya@balajitours.in", "admin"]], endIn: 5, periods: 2, gstin: "29ABCDE1234F1Z5", state: "Karnataka", address: "12, MG Road, Mysuru 570001", notes: "Prefers WhatsApp for reminders." },
  { id: "ws-coastal", company: "Coastal Holidays", sub: "coastalholidays", product: "travel", tier: "starter", cycle: "quarterly", status: "active", owner: ["Anitha Menon", "anitha@coastalholidays.com", "94470 55443"], endIn: 62, periods: 4, state: "Kerala", address: "Marine Drive, Kochi 682031" },
  { id: "ws-apex", company: "Apex Realty", sub: "apexrealty", product: "sales", tier: "enterprise", cycle: "yearly", status: "active", owner: ["Vikram Shetty", "vikram@apexrealty.in", "99000 11223"], members: [["Neha Rao", "neha@apexrealty.in", "admin"], ["Kiran P", "kiran@apexrealty.in", "member"], ["Sana Ali", "sana@apexrealty.in", "member"]], endIn: 210, periods: 1, gstin: "29AAPCA9876K1Z2", state: "Karnataka", address: "4th Floor, Prestige Tower, Bengaluru 560025" },
  { id: "ws-brightpath", company: "Brightpath Solutions", sub: "brightpath", product: "sales", tier: "growth", cycle: "halfyearly", status: "active", owner: ["Pooja Iyer", "pooja@brightpath.co", "97411 88990"], members: [["Arjun N", "arjun@brightpath.co", "member"]], endIn: 18, periods: 2, scheduled: { tier: "growth", cycle: "yearly" }, state: "Tamil Nadu", address: "T. Nagar, Chennai 600017" },
  { id: "ws-greenleaf", company: "Greenleaf Technologies", sub: "greenleaf", product: "hrms", tier: "growth", cycle: "yearly", status: "active", owner: ["Suresh Babu", "suresh@greenleaftech.in", "90080 76543"], members: [["Lakshmi V", "lakshmi@greenleaftech.in", "admin"]], endIn: 150, periods: 1, gstin: "29AAGCG4567L1Z8", state: "Karnataka", address: "Whitefield, Bengaluru 560066" },
  { id: "ws-kaveri", company: "Kaveri Foods", sub: "kaverifoods", product: "hrms", tier: "starter", cycle: "halfyearly", status: "active", owner: ["Manjunath Gowda", "manju@kaverifoods.in", "98861 23456"], endIn: 172, periods: 2, state: "Karnataka", address: "Industrial Area, Mandya 571401" },
  { id: "ws-nova", company: "Nova Manufacturing", sub: "novamfg", product: "hrms", tier: "enterprise", cycle: "quarterly", status: "grace", owner: ["Harish Patel", "harish@novamfg.com", "98250 33221"], members: [["Meena J", "meena@novamfg.com", "admin"]], endIn: -3, periods: 3, gstin: "24AABCN1122M1Z4", state: "Gujarat", address: "GIDC, Ahmedabad 382445", notes: "Accounts team slow to approve — call Harish directly." },
  { id: "ws-skyline", company: "Skyline Travels", sub: "skylinetravels", product: "travel", tier: "starter", cycle: "yearly", status: "locked", owner: ["Faisal Khan", "faisal@skylinetravels.in", "98200 44556"], endIn: -40, periods: 1, state: "Maharashtra", address: "Andheri East, Mumbai 400069" },
  { id: "ws-metro", company: "Metro Motors", sub: "metromotors", product: "sales", tier: "starter", cycle: "quarterly", status: "pending", owner: ["Deepak Reddy", "deepak@metromotors.in", "99630 77889"], createdAgo: 2, state: "Telangana", address: "Banjara Hills, Hyderabad 500034" },
  { id: "ws-horizon", company: "Horizon Edu Academy", sub: "horizonedu", product: "sales", tier: "growth", cycle: "yearly", status: "pending", owner: ["Priya Nair", "priya@horizonedu.in", "94950 66778"], createdAgo: 6, state: "Kerala", address: "Kowdiar, Thiruvananthapuram 695003" },
];

export const WORKSPACES: WorkspaceT[] = [];
export const PAYMENTS: PaymentT[] = [];

let payN = 0;
function payment(ws: WorkspaceT, tier: Tier, cycle: Cycle, kind: PaymentT["kind"], status: PaymentT["status"], at: Date, period?: [Date, Date]): PaymentT {
  const plan = PLANS.find((p) => p.tier === tier)!;
  const amount = priceFor(plan, cycle);
  const g = withGst(amount);
  const p: PaymentT = {
    _id: `pay-${++payN}`,
    workspace: ws._id,
    user: ws.owner,
    product: ws.product,
    tier,
    cycle,
    amount,
    gstRate: g.rate,
    gstAmount: g.gst,
    total: g.total,
    kind,
    status,
    razorpayPaymentId: status === "paid" ? `pay_${(payN * 7919).toString(36).toUpperCase()}DEMO${payN}` : "",
    invoiceNumber: "",
    periodStart: period?.[0] ?? null,
    periodEnd: period?.[1] ?? null,
    paidAt: status === "paid" ? at : null,
    createdAt: at,
  };
  PAYMENTS.push(p);
  return p;
}

for (const s of SEEDS) {
  const ownerId = user(`u-${s.id}`, ...s.owner);
  const members = (s.members ?? []).map(([name, email, role], i) => ({
    user: user(`u-${s.id}-${i}`, name, email, ""),
    role,
  }));
  const plan = PLANS.find((p) => p.tier === s.tier)!;
  const ws: WorkspaceT = {
    _id: s.id,
    owner: ownerId,
    members,
    product: s.product,
    subdomain: s.sub,
    customDomain: "",
    companyName: s.company,
    plan: { tier: s.tier, cycle: s.cycle, price: priceFor(plan, s.cycle) },
    scheduledChange: s.scheduled ?? null,
    status: s.status,
    trialEndsAt: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    graceEndsAt: null,
    contact: { name: s.owner[0], email: s.owner[1], phone: s.owner[2] },
    billing: { gstin: s.gstin ?? "", address: s.address, state: s.state },
    notes: s.notes ?? "",
    createdAt: ago(s.createdAgo ?? 0),
  };

  if (s.periods && s.endIn != null) {
    // Walk back from the current period end, one billing term at a time.
    let end = ago(-s.endIn, 0);
    const periods: [Date, Date][] = [];
    for (let i = 0; i < s.periods; i++) {
      const start = minusMonths(end, cycleMonths(s.cycle));
      periods.unshift([start, end]);
      end = start;
    }
    ws.createdAt = new Date(periods[0][0].getTime() - 2 * DAY);
    ws.currentPeriodStart = periods[0][0];
    ws.currentPeriodEnd = periods[periods.length - 1][1];
    periods.forEach(([start, e], i) => {
      const paidAt = new Date(start.getTime() - (i === 0 ? 0 : 3 * DAY) + 11 * 3600_000);
      payment(ws, s.tier, s.cycle, i === 0 ? "new" : "renewal", "paid", paidAt, [start, e]);
    });
    if (s.status === "grace") ws.graceEndsAt = new Date(ws.currentPeriodEnd.getTime() + 7 * DAY);
    if (s.status === "locked") ws.graceEndsAt = new Date(ws.currentPeriodEnd.getTime() + 7 * DAY);
    if (s.status === "grace" || s.status === "locked") {
      payment(ws, s.tier, s.cycle, "renewal", "created", new Date(ws.currentPeriodEnd.getTime() - 7 * DAY));
    }
  } else {
    payment(ws, s.tier, s.cycle, "new", "created", ws.createdAt);
  }
  WORKSPACES.push(ws);
}

// One abandoned link (customer switched plan) to show a "Cancelled" row.
payment(WORKSPACES.find((w) => w._id === "ws-horizon")!, "starter", "yearly", "new", "failed", ago(7));

// Invoice numbers in payment order.
PAYMENTS.filter((p) => p.status === "paid")
  .sort((a, b) => +a.paidAt! - +b.paidAt!)
  .forEach((p, i) => {
    const d = p.paidAt!;
    p.invoiceNumber = `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(5, "0")}`;
  });

/* ------------------------------------------------------------------ */
/* Leads                                                              */
/* ------------------------------------------------------------------ */
const lead = (
  id: string,
  name: string,
  company: string,
  phone: string,
  email: string,
  product: string,
  status: LeadT["status"],
  daysAgo: number,
  source: string,
  message: string,
  workspace: string | null = null,
  notes = "",
): LeadT => ({ _id: id, name, company, phone, email, product, status, createdAt: ago(daysAgo, 9 + (daysAgo % 8)), source, message, workspace, notes, landingPage: "" });

export const LEADS: LeadT[] = [
  lead("ld-1", "Karthik Raj", "Wanderlust Trips", "98860 11122", "karthik@wanderlust.in", "travel", "new", 0, "website", "Need a CRM for 3 agents handling international packages."),
  lead("ld-2", "Sneha Kulkarni", "Kulkarni Associates", "99450 22233", "sneha@kulkarni.co", "sales", "new", 1, "WhatsApp", "Looking for lead tracking + follow-up reminders."),
  lead("ld-3", "Imran Sheikh", "", "97390 33344", "", "", "new", 1, "Phone", "Asked for a demo, product not decided."),
  lead("ld-4", "Revathi Subramanian", "Sunrise Hospital", "94440 44455", "revathi@sunrisehospital.org", "hrms", "contacted", 3, "website", "120 staff, need attendance and payroll.", null, "Demo fixed for Friday 11am"),
  lead("ld-5", "Arvind Joshi", "Joshi Exports", "98220 55566", "arvind@joshiexports.com", "sales", "contacted", 5, "Referral", "Referred by Apex Realty.", null, "Send pricing PDF"),
  lead("ld-6", "Deepak Reddy", "Metro Motors", "99630 77889", "deepak@metromotors.in", "sales", "signed_up", 3, "website", "Car dealership, 1 user to start.", "ws-metro"),
  lead("ld-7", "Priya Nair", "Horizon Edu Academy", "94950 66778", "priya@horizonedu.in", "sales", "signed_up", 8, "Event", "Admissions enquiries pipeline.", "ws-horizon"),
  lead("ld-8", "Ramesh Kumar", "Sri Balaji Tours & Travels", "98450 12345", "ramesh@balajitours.in", "travel", "converted", 380, "website", "Tour operator in Mysuru.", "ws-balaji"),
  lead("ld-9", "Vikram Shetty", "Apex Realty", "99000 11223", "vikram@apexrealty.in", "sales", "converted", 160, "Referral", "Real estate sales team of 8.", "ws-apex"),
  lead("ld-10", "Suresh Babu", "Greenleaf Technologies", "90080 76543", "suresh@greenleaftech.in", "hrms", "converted", 218, "website", "IT company, 45 employees.", "ws-greenleaf"),
  lead("ld-11", "Gautam Mehta", "Mehta Textiles", "98250 66677", "gautam@mehtatextiles.in", "hrms", "lost", 20, "Email", "Wanted biometric integration.", null, "Went with another vendor"),
  lead("ld-12", "Ayesha Siddiqui", "Dream Destinations", "98450 77788", "ayesha@dreamdest.in", "travel", "new", 0, "Instagram", "Small agency, wants WhatsApp enquiries in CRM."),
];

/* ------------------------------------------------------------------ */
/* CRM records inside each customer CRM                               */
/* ------------------------------------------------------------------ */
const SAMPLE: Record<string, Record<string, unknown>[]> = {
  // Travel CRM
  enquiries: [
    { name: "Rahul Verma", phone: "98450 10001", email: "rahul.v@gmail.com", destination: "Bali", travelDate: day(25), travellers: 2, budget: 120000, source: "Instagram", status: "New" },
    { name: "Meera Krishnan", phone: "98450 10002", email: "meera.k@gmail.com", destination: "Kashmir", travelDate: day(40), travellers: 4, budget: 160000, source: "Website", status: "Quotation Sent" },
    { name: "Sanjay Gupta", phone: "98450 10003", destination: "Dubai", travelDate: day(15), travellers: 3, budget: 210000, source: "WhatsApp", status: "Follow Up" },
    { name: "Fatima Begum", phone: "98450 10004", destination: "Singapore", travelDate: day(60), travellers: 2, budget: 180000, source: "Referral", status: "Contacted" },
    { name: "Nikhil Rao", phone: "98450 10005", destination: "Goa", travelDate: day(10), travellers: 6, budget: 90000, source: "Phone", status: "Booked" },
    { name: "Anjali Desai", phone: "98450 10006", destination: "Maldives", travelDate: day(35), travellers: 2, budget: 250000, source: "Facebook", status: "New" },
    { name: "Tarun Bhat", phone: "98450 10007", destination: "Ooty", travelDate: day(5), travellers: 5, budget: 45000, source: "Walk-in", status: "Lost" },
  ],
  bookings: [
    { customer: "Nikhil Rao", phone: "98450 10005", packageName: "Goa Beach Escape", destination: "Goa", startDate: day(10), endDate: day(14), travellers: 6, amount: 87000, amountPaid: 40000, status: "Confirmed" },
    { customer: "Lalitha Prasad", phone: "98450 10011", packageName: "Kerala Backwaters", destination: "Alleppey", startDate: day(-20), endDate: day(-16), travellers: 2, amount: 38000, amountPaid: 38000, status: "Completed" },
    { customer: "Rohan Mehta", phone: "98450 10012", packageName: "Dubai Delight", destination: "Dubai", startDate: day(30), endDate: day(35), travellers: 3, amount: 198000, amountPaid: 50000, status: "Pending" },
    { customer: "Kavya Hegde", phone: "98450 10013", packageName: "Kashmir Paradise", destination: "Srinagar", startDate: day(45), endDate: day(51), travellers: 4, amount: 152000, amountPaid: 152000, status: "Confirmed" },
    { customer: "Joseph Mathew", phone: "98450 10014", packageName: "Goa Beach Escape", destination: "Goa", startDate: day(-5), endDate: day(-1), travellers: 2, amount: 29000, amountPaid: 0, status: "Cancelled" },
  ],
  packages: [
    { name: "Goa Beach Escape", destination: "Goa", days: 4, nights: 3, price: 14500, inclusions: "Hotel, breakfast, airport transfers, North Goa tour", status: "Active" },
    { name: "Kerala Backwaters", destination: "Alleppey", days: 4, nights: 3, price: 19000, inclusions: "Houseboat stay, all meals, Munnar day trip", status: "Active" },
    { name: "Dubai Delight", destination: "Dubai", days: 6, nights: 5, price: 66000, inclusions: "Flights, 4-star hotel, desert safari, city tour", status: "Active" },
    { name: "Kashmir Paradise", destination: "Srinagar", days: 7, nights: 6, price: 38000, inclusions: "Houseboat, Gulmarg & Pahalgam, all meals", status: "Active" },
    { name: "Shimla Manali Winter", destination: "Manali", days: 6, nights: 5, price: 24000, inclusions: "Volvo travel, hotels, sightseeing", status: "Inactive" },
  ],
  customers: [
    { name: "Nikhil Rao", phone: "98450 10005", email: "nikhil.rao@gmail.com", city: "Mysuru" },
    { name: "Lalitha Prasad", phone: "98450 10011", email: "lalitha.p@gmail.com", city: "Bengaluru" },
    { name: "Rohan Mehta", phone: "98450 10012", email: "rohan.m@gmail.com", city: "Mysuru", passportNo: "Z1234567" },
    { name: "Kavya Hegde", phone: "98450 10013", email: "kavya.h@gmail.com", city: "Mangaluru" },
    { name: "Joseph Mathew", phone: "98450 10014", email: "joseph.m@gmail.com", city: "Kochi" },
  ],
  // Sales CRM
  leads: [
    { name: "Aditya Sharma", company: "Sharma Builders", email: "aditya@sharmabuilders.in", phone: "99000 20001", source: "Website", estimatedValue: 450000, status: "New" },
    { name: "Bhavana Rao", company: "Rao Interiors", email: "bhavana@raointeriors.com", phone: "99000 20002", source: "Referral", estimatedValue: 180000, status: "Contacted" },
    { name: "Chetan Patil", company: "Patil Logistics", email: "chetan@patillogistics.in", phone: "99000 20003", source: "Cold Call", estimatedValue: 320000, status: "Qualified" },
    { name: "Dhanya Pillai", company: "Pillai Pharma", email: "dhanya@pillaipharma.com", phone: "99000 20004", source: "Event", estimatedValue: 600000, status: "Qualified" },
    { name: "Eshwar Naidu", company: "Naidu Agro", email: "eshwar@naiduagro.in", phone: "99000 20005", source: "Email Campaign", estimatedValue: 90000, status: "Unqualified" },
    { name: "Farah Khan", company: "FK Boutique", email: "farah@fkboutique.in", phone: "99000 20006", source: "Social Media", estimatedValue: 75000, status: "Converted" },
  ],
  deals: [
    { title: "Sharma Builders – 20 units", company: "Sharma Builders", contactName: "Aditya Sharma", value: 450000, stage: "Prospecting", expectedClose: day(45), owner: "Neha Rao" },
    { title: "Patil Logistics annual contract", company: "Patil Logistics", contactName: "Chetan Patil", value: 320000, stage: "Proposal", expectedClose: day(20), owner: "Kiran P" },
    { title: "Pillai Pharma rollout", company: "Pillai Pharma", contactName: "Dhanya Pillai", value: 600000, stage: "Negotiation", expectedClose: day(12), owner: "Neha Rao" },
    { title: "Rao Interiors showroom", company: "Rao Interiors", contactName: "Bhavana Rao", value: 180000, stage: "Qualification", expectedClose: day(30), owner: "Sana Ali" },
    { title: "FK Boutique starter pack", company: "FK Boutique", contactName: "Farah Khan", value: 75000, stage: "Won", expectedClose: day(-5), owner: "Kiran P" },
    { title: "Naidu Agro pilot", company: "Naidu Agro", contactName: "Eshwar Naidu", value: 90000, stage: "Lost", expectedClose: day(-12), owner: "Sana Ali" },
  ],
  contacts: [
    { name: "Aditya Sharma", company: "Sharma Builders", designation: "Director", email: "aditya@sharmabuilders.in", phone: "99000 20001", city: "Bengaluru" },
    { name: "Bhavana Rao", company: "Rao Interiors", designation: "Owner", email: "bhavana@raointeriors.com", phone: "99000 20002", city: "Mysuru" },
    { name: "Chetan Patil", company: "Patil Logistics", designation: "Operations Head", email: "chetan@patillogistics.in", phone: "99000 20003", city: "Pune" },
    { name: "Dhanya Pillai", company: "Pillai Pharma", designation: "Procurement Manager", email: "dhanya@pillaipharma.com", phone: "99000 20004", city: "Kochi" },
    { name: "Farah Khan", company: "FK Boutique", designation: "Founder", email: "farah@fkboutique.in", phone: "99000 20006", city: "Hyderabad" },
  ],
  tasks: [
    { title: "Send revised quote to Patil Logistics", relatedTo: "Patil Logistics", dueDate: day(1), priority: "High", status: "Open" },
    { title: "Site visit with Aditya", relatedTo: "Sharma Builders", dueDate: day(3), priority: "Medium", status: "Open" },
    { title: "Negotiation call – Pillai Pharma", relatedTo: "Pillai Pharma", dueDate: day(0), priority: "High", status: "In Progress" },
    { title: "Collect KYC documents", relatedTo: "FK Boutique", dueDate: day(-2), priority: "Low", status: "Done" },
    { title: "Follow up on showroom layout", relatedTo: "Rao Interiors", dueDate: day(5), priority: "Medium", status: "Open" },
  ],
  // HRMS
  employees: [
    { employeeId: "EMP001", name: "Anand Kumar", email: "anand@company.in", phone: "90000 30001", department: "Engineering", designation: "Senior Developer", joiningDate: day(-900), salary: 95000, status: "Active" },
    { employeeId: "EMP002", name: "Bindu Ramesh", email: "bindu@company.in", phone: "90000 30002", department: "HR", designation: "HR Manager", joiningDate: day(-1200), salary: 80000, status: "Active" },
    { employeeId: "EMP003", name: "Chandra Shekar", email: "chandra@company.in", phone: "90000 30003", department: "Sales", designation: "Sales Executive", joiningDate: day(-300), salary: 45000, status: "Active" },
    { employeeId: "EMP004", name: "Divya Prakash", email: "divya@company.in", phone: "90000 30004", department: "Finance", designation: "Accountant", joiningDate: day(-700), salary: 55000, status: "On Leave" },
    { employeeId: "EMP005", name: "Eshan Gowda", email: "eshan@company.in", phone: "90000 30005", department: "Support", designation: "Support Engineer", joiningDate: day(-150), salary: 38000, status: "Active" },
    { employeeId: "EMP006", name: "Farida Banu", email: "farida@company.in", phone: "90000 30006", department: "Marketing", designation: "Marketing Lead", joiningDate: day(-500), salary: 70000, status: "On Notice" },
    { employeeId: "EMP007", name: "Ganesh Murthy", email: "ganesh@company.in", phone: "90000 30007", department: "Operations", designation: "Operations Manager", joiningDate: day(-1500), salary: 88000, status: "Exited" },
  ],
  attendance: [
    { employee: "Anand Kumar", date: day(0), checkIn: "09:12", checkOut: "18:30", status: "Present" },
    { employee: "Bindu Ramesh", date: day(0), checkIn: "09:45", checkOut: "18:05", status: "Present" },
    { employee: "Chandra Shekar", date: day(0), checkIn: "10:02", checkOut: "", status: "Work From Home" },
    { employee: "Divya Prakash", date: day(0), status: "On Leave" },
    { employee: "Eshan Gowda", date: day(0), checkIn: "09:30", checkOut: "13:30", status: "Half Day" },
    { employee: "Farida Banu", date: day(0), status: "Absent" },
  ],
  leaves: [
    { employee: "Divya Prakash", leaveType: "Sick", fromDate: day(-1), toDate: day(1), days: 3, reason: "Fever", status: "Approved" },
    { employee: "Anand Kumar", leaveType: "Earned", fromDate: day(14), toDate: day(18), days: 5, reason: "Family trip", status: "Pending" },
    { employee: "Eshan Gowda", leaveType: "Casual", fromDate: day(3), toDate: day(3), days: 1, reason: "Personal work", status: "Pending" },
    { employee: "Farida Banu", leaveType: "Unpaid", fromDate: day(-10), toDate: day(-8), days: 3, reason: "Relocation", status: "Rejected" },
  ],
  payroll: [
    { employee: "Anand Kumar", month: "Last month", basic: 70000, allowances: 25000, deductions: 8500, netPay: 86500, status: "Paid" },
    { employee: "Bindu Ramesh", month: "Last month", basic: 60000, allowances: 20000, deductions: 7200, netPay: 72800, status: "Paid" },
    { employee: "Chandra Shekar", month: "Last month", basic: 35000, allowances: 10000, deductions: 3800, netPay: 41200, status: "Paid" },
    { employee: "Divya Prakash", month: "Last month", basic: 42000, allowances: 13000, deductions: 4600, netPay: 50400, status: "Pending" },
    { employee: "Eshan Gowda", month: "Last month", basic: 30000, allowances: 8000, deductions: 3100, netPay: 34900, status: "Pending" },
  ],
};

export const RECORDS: RecordT[] = WORKSPACES.flatMap((ws) =>
  PRODUCTS[ws.product as ProductKey].entities.flatMap((e) =>
    (SAMPLE[e.key] ?? []).map((data, i) => ({
      _id: `${ws._id}-${e.key}-${i + 1}`,
      workspace: ws._id,
      entity: e.key,
      data: { ...data },
      createdAt: ago(i * 3 + 1, 11 + i),
    })),
  ),
);

/* ------------------------------------------------------------------ */
/* Email log                                                          */
/* ------------------------------------------------------------------ */
let mailN = 0;
const mail = (to: string, subject: string, type: string, workspace: string | null, createdAt: Date, status: EmailLogT["status"] = "sent", error = ""): EmailLogT => ({
  _id: `mail-${++mailN}`,
  to,
  subject,
  type,
  workspace,
  status,
  error,
  createdAt,
});

export const EMAILS: EmailLogT[] = [
  ...WORKSPACES.map((w) => mail(w.contact.email, `${PRODUCTS[w.product as ProductKey].name} for ${w.companyName} – complete your payment`, "welcome", w._id, w.createdAt)),
  ...PAYMENTS.filter((p) => p.status === "paid").map((p) => {
    const w = WORKSPACES.find((x) => x._id === p.workspace)!;
    return mail(w.contact.email, `Payment received – ${PRODUCTS[w.product as ProductKey].name} (${p.invoiceNumber})`, "invoice", w._id, new Date(p.paidAt!.getTime() + 60_000));
  }),
  mail("ramesh@balajitours.in", "Your Travel CRM yearly plan renews in 7 days", "reminder_7d", "ws-balaji", ago(2, 9)),
  mail("pooja@brightpath.co", "Your Sales CRM half yearly plan renews in 18 days", "payment_link", "ws-brightpath", ago(1, 15)),
  mail("harish@novamfg.com", "Your HRMS quarterly plan renews in 7 days", "reminder_7d", "ws-nova", ago(10, 9)),
  mail("harish@novamfg.com", "Your HRMS quarterly plan renews in 1 day", "reminder_1d", "ws-nova", ago(4, 9)),
  mail("harish@novamfg.com", "Your HRMS subscription has expired", "expired", "ws-nova", ago(3, 9)),
  mail("faisal@skylinetravels.in", "Travel CRM access paused – renew to continue", "locked", "ws-skyline", ago(33, 9)),
  mail("faisal@skylinetravels.in", "Travel CRM for Skyline Travels – complete your payment", "payment_link", "ws-skyline", ago(12, 16), "failed", "Mailbox full (552)"),
  mail("karthik@wanderlust.in", "Thanks for your interest in Travel CRM", "lead_welcome", null, ago(0, 9)),
  mail("revathi@sunrisehospital.org", "Thanks for your interest in HRMS", "lead_welcome", null, ago(3, 11)),
].sort((a, b) => +b.createdAt - +a.createdAt);

/* ------------------------------------------------------------------ */
/* Lookups                                                            */
/* ------------------------------------------------------------------ */
export const userById = (id: string) => USERS.find((u) => u._id === id) ?? null;
export const wsById = (id: string | null | undefined) => WORKSPACES.find((w) => w._id === id) ?? null;
export const wsBySub = (sub: string) => WORKSPACES.find((w) => w.subdomain === sub.toLowerCase()) ?? null;
export const ownerOf = (ws: WorkspaceT) => userById(ws.owner);
export const paymentsOf = (wsId: string) => PAYMENTS.filter((p) => p.workspace === wsId).sort((a, b) => +b.createdAt - +a.createdAt);
export const byNewest = <T extends { createdAt: Date }>(list: T[]) => [...list].sort((a, b) => +b.createdAt - +a.createdAt);

/** Case-insensitive "contains" across a few text values. */
export const matches = (q: string, ...values: (string | null | undefined)[]) => {
  const t = q.trim().toLowerCase();
  return !t || values.some((v) => (v ?? "").toLowerCase().includes(t));
};

