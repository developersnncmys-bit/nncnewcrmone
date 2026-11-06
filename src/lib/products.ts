// Central product catalogue. Every CRM product (Travel / Sales / HRMS) and the
// modules (entities) inside it are defined here. Adding a new product or module
// = adding config here; the generic list/board/form screens render it.

export type ProductKey = "travel" | "sales" | "hrms";
export const PRODUCT_KEYS: ProductKey[] = ["travel", "sales", "hrms"];

export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "currency"
  | "date"
  | "time"
  | "select"
  | "textarea"
  | "ref"; // value picked from another module's records (e.g. employee)

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  ref?: string; // entity key for type "ref"
  required?: boolean;
  list?: boolean; // show as a column in the table
}

export interface Entity {
  key: string;
  label: string;
  singular: string;
  icon: string;
  titleField: string;
  statusField?: string;
  board?: boolean; // supports Kanban / pipeline view
  fields: Field[];
}

export interface Product {
  key: ProductKey;
  name: string;
  short: string;
  icon: string;
  tagline: string;
  description: string;
  theme: { solid: string; soft: string; text: string; border: string };
  highlights: string[];
  entities: Entity[];
}

const notes: Field = { key: "notes", label: "Notes", type: "textarea" };

export const PRODUCTS: Record<ProductKey, Product> = {
  travel: {
    key: "travel",
    name: "Travel CRM",
    short: "Travel",
    icon: "Plane",
    tagline: "Enquiries, packages and bookings for travel agencies.",
    description:
      "Capture travel enquiries from every channel, send quotations, manage tour packages and track every booking and payment in one place.",
    theme: {
      solid: "bg-sky-600",
      soft: "bg-sky-50 text-sky-700",
      text: "text-sky-600",
      border: "border-sky-200",
    },
    highlights: [
      "Travel lead pipeline (New → Quoted → Booked)",
      "Tour package catalogue with pricing",
      "Bookings with paid / pending amounts",
      "Customer profiles with passport details",
    ],
    entities: [
      {
        key: "enquiries",
        label: "Travel Leads",
        singular: "Travel Lead",
        icon: "Inbox",
        titleField: "name",
        statusField: "status",
        board: true,
        fields: [
          { key: "name", label: "Name", type: "text", required: true, list: true },
          { key: "phone", label: "Phone", type: "phone", required: true, list: true },
          { key: "email", label: "Email", type: "email" },
          { key: "destination", label: "Destination", type: "text", list: true },
          { key: "travelDate", label: "Travel date", type: "date", list: true },
          { key: "travellers", label: "Travellers", type: "number" },
          { key: "budget", label: "Budget", type: "currency", list: true },
          {
            key: "source",
            label: "Source",
            type: "select",
            options: ["Website", "Phone", "WhatsApp", "Instagram", "Facebook", "Referral", "Walk-in"],
          },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: ["New", "Contacted", "Quotation Sent", "Follow Up", "Booked", "Lost"],
            list: true,
          },
          notes,
        ],
      },
      {
        key: "bookings",
        label: "Bookings",
        singular: "Booking",
        icon: "Ticket",
        titleField: "customer",
        statusField: "status",
        board: true,
        fields: [
          { key: "customer", label: "Customer", type: "ref", ref: "customers", required: true, list: true },
          { key: "phone", label: "Phone", type: "phone", list: true },
          { key: "packageName", label: "Package", type: "ref", ref: "packages", list: true },
          { key: "destination", label: "Destination", type: "text" },
          { key: "startDate", label: "Start date", type: "date", list: true },
          { key: "endDate", label: "End date", type: "date" },
          { key: "travellers", label: "Travellers", type: "number" },
          { key: "amount", label: "Total amount", type: "currency", list: true },
          { key: "amountPaid", label: "Amount paid", type: "currency", list: true },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: ["Pending", "Confirmed", "Completed", "Cancelled"],
            list: true,
          },
          notes,
        ],
      },
      {
        key: "packages",
        label: "Packages",
        singular: "Package",
        icon: "Package",
        titleField: "name",
        statusField: "status",
        fields: [
          { key: "name", label: "Package name", type: "text", required: true, list: true },
          { key: "destination", label: "Destination", type: "text", list: true },
          { key: "days", label: "Days", type: "number", list: true },
          { key: "nights", label: "Nights", type: "number", list: true },
          { key: "price", label: "Price per person", type: "currency", list: true },
          { key: "inclusions", label: "Inclusions", type: "textarea" },
          { key: "exclusions", label: "Exclusions", type: "textarea" },
          { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"], list: true },
        ],
      },
      {
        key: "customers",
        label: "Customers",
        singular: "Customer",
        icon: "Users",
        titleField: "name",
        fields: [
          { key: "name", label: "Name", type: "text", required: true, list: true },
          { key: "phone", label: "Phone", type: "phone", list: true },
          { key: "email", label: "Email", type: "email", list: true },
          { key: "city", label: "City", type: "text", list: true },
          { key: "passportNo", label: "Passport no.", type: "text" },
          { key: "dob", label: "Date of birth", type: "date" },
          notes,
        ],
      },
    ],
  },

  sales: {
    key: "sales",
    name: "Sales CRM",
    short: "Sales",
    icon: "TrendingUp",
    tagline: "Leads, deals pipeline and follow-ups for sales teams.",
    description:
      "Track every lead from first contact to closed deal with a visual pipeline, contacts, and task follow-ups for your sales team.",
    theme: {
      solid: "bg-indigo-600",
      soft: "bg-indigo-50 text-indigo-700",
      text: "text-indigo-600",
      border: "border-indigo-200",
    },
    highlights: [
      "Lead management with sources",
      "Deal pipeline board (Prospecting → Won)",
      "Contacts & companies",
      "Tasks and follow-up reminders",
    ],
    entities: [
      {
        key: "leads",
        label: "Leads",
        singular: "Lead",
        icon: "Inbox",
        titleField: "name",
        statusField: "status",
        board: true,
        fields: [
          { key: "name", label: "Name", type: "text", required: true, list: true },
          { key: "company", label: "Company", type: "text", list: true },
          { key: "email", label: "Email", type: "email", list: true },
          { key: "phone", label: "Phone", type: "phone", list: true },
          {
            key: "source",
            label: "Source",
            type: "select",
            options: ["Website", "Referral", "Cold Call", "Email Campaign", "Social Media", "Event"],
            list: true,
          },
          { key: "estimatedValue", label: "Estimated value", type: "currency" },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: ["New", "Contacted", "Qualified", "Unqualified", "Converted"],
            list: true,
          },
          notes,
        ],
      },
      {
        key: "deals",
        label: "Deals",
        singular: "Deal",
        icon: "Handshake",
        titleField: "title",
        statusField: "stage",
        board: true,
        fields: [
          { key: "title", label: "Deal title", type: "text", required: true, list: true },
          { key: "company", label: "Company", type: "text", list: true },
          { key: "contactName", label: "Contact", type: "ref", ref: "contacts" },
          { key: "value", label: "Value", type: "currency", list: true },
          {
            key: "stage",
            label: "Stage",
            type: "select",
            options: ["Prospecting", "Qualification", "Proposal", "Negotiation", "Won", "Lost"],
            list: true,
          },
          { key: "expectedClose", label: "Expected close", type: "date", list: true },
          { key: "owner", label: "Owner", type: "text" },
          notes,
        ],
      },
      {
        key: "contacts",
        label: "Contacts",
        singular: "Contact",
        icon: "Contact",
        titleField: "name",
        fields: [
          { key: "name", label: "Name", type: "text", required: true, list: true },
          { key: "company", label: "Company", type: "text", list: true },
          { key: "designation", label: "Designation", type: "text", list: true },
          { key: "email", label: "Email", type: "email", list: true },
          { key: "phone", label: "Phone", type: "phone", list: true },
          { key: "city", label: "City", type: "text" },
        ],
      },
      {
        key: "tasks",
        label: "Tasks",
        singular: "Task",
        icon: "CheckSquare",
        titleField: "title",
        statusField: "status",
        board: true,
        fields: [
          { key: "title", label: "Task", type: "text", required: true, list: true },
          { key: "relatedTo", label: "Related to", type: "text", list: true },
          { key: "dueDate", label: "Due date", type: "date", list: true },
          { key: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High"], list: true },
          { key: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Done"], list: true },
          notes,
        ],
      },
    ],
  },

  hrms: {
    key: "hrms",
    name: "HRMS",
    short: "HRMS",
    icon: "UserCog",
    tagline: "Employees, attendance, leave and payroll.",
    description:
      "Run HR for your company: employee records, daily attendance, leave approvals and monthly payroll in one simple system.",
    theme: {
      solid: "bg-emerald-600",
      soft: "bg-emerald-50 text-emerald-700",
      text: "text-emerald-600",
      border: "border-emerald-200",
    },
    highlights: [
      "Employee directory & departments",
      "Daily attendance with check-in / out",
      "Leave requests with approval board",
      "Monthly payroll with auto net pay",
    ],
    entities: [
      {
        key: "employees",
        label: "Employees",
        singular: "Employee",
        icon: "Users",
        titleField: "name",
        statusField: "status",
        fields: [
          { key: "employeeId", label: "Employee ID", type: "text", list: true },
          { key: "name", label: "Name", type: "text", required: true, list: true },
          { key: "email", label: "Email", type: "email", list: true },
          { key: "phone", label: "Phone", type: "phone" },
          {
            key: "department",
            label: "Department",
            type: "select",
            options: ["Engineering", "Sales", "Marketing", "HR", "Finance", "Operations", "Support"],
            list: true,
          },
          { key: "designation", label: "Designation", type: "text", list: true },
          { key: "joiningDate", label: "Joining date", type: "date" },
          { key: "salary", label: "Monthly salary", type: "currency" },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: ["Active", "On Notice", "On Leave", "Exited"],
            list: true,
          },
        ],
      },
      {
        key: "attendance",
        label: "Attendance",
        singular: "Attendance",
        icon: "Clock",
        titleField: "employee",
        statusField: "status",
        fields: [
          { key: "employee", label: "Employee", type: "ref", ref: "employees", required: true, list: true },
          { key: "date", label: "Date", type: "date", required: true, list: true },
          { key: "checkIn", label: "Check in", type: "time", list: true },
          { key: "checkOut", label: "Check out", type: "time", list: true },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: ["Present", "Absent", "Half Day", "Work From Home", "On Leave"],
            list: true,
          },
        ],
      },
      {
        key: "leaves",
        label: "Leave Requests",
        singular: "Leave Request",
        icon: "CalendarDays",
        titleField: "employee",
        statusField: "status",
        board: true,
        fields: [
          { key: "employee", label: "Employee", type: "ref", ref: "employees", required: true, list: true },
          {
            key: "leaveType",
            label: "Leave type",
            type: "select",
            options: ["Casual", "Sick", "Earned", "Unpaid", "Maternity / Paternity"],
            list: true,
          },
          { key: "fromDate", label: "From", type: "date", required: true, list: true },
          { key: "toDate", label: "To", type: "date", required: true, list: true },
          { key: "days", label: "Days", type: "number", list: true },
          { key: "reason", label: "Reason", type: "textarea" },
          { key: "status", label: "Status", type: "select", options: ["Pending", "Approved", "Rejected"], list: true },
        ],
      },
      {
        key: "payroll",
        label: "Payroll",
        singular: "Payslip",
        icon: "Wallet",
        titleField: "employee",
        statusField: "status",
        fields: [
          { key: "employee", label: "Employee", type: "ref", ref: "employees", required: true, list: true },
          { key: "month", label: "Month", type: "text", required: true, list: true },
          { key: "basic", label: "Basic", type: "currency", list: true },
          { key: "allowances", label: "Allowances", type: "currency" },
          { key: "deductions", label: "Deductions", type: "currency" },
          { key: "netPay", label: "Net pay (auto if empty)", type: "currency", list: true },
          { key: "status", label: "Status", type: "select", options: ["Pending", "Paid"], list: true },
        ],
      },
    ],
  },
};

export const productList = () => PRODUCT_KEYS.map((k) => PRODUCTS[k]);
export const isProductKey = (v: unknown): v is ProductKey =>
  typeof v === "string" && (PRODUCT_KEYS as string[]).includes(v);
export const getEntity = (product: ProductKey, entity: string) =>
  PRODUCTS[product].entities.find((e) => e.key === entity);
