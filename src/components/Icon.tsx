import {
  ArrowRight, Bell, Building2, CalendarDays, Check, CheckSquare, Clock, Contact, CreditCard, FileText, Globe,
  Handshake, Inbox, Kanban, LayoutDashboard, List, Lock, LogOut, Mail, Package, Plane, Search, Settings, Sparkles, Download, Phone, Activity, Plus, ShieldCheck,
  Ticket, TrendingUp, UserCog, Users, Wallet, type LucideProps,
} from "lucide-react";

const ICONS = {
  ArrowRight, Bell, Building2, CalendarDays, Check, CheckSquare, Clock, Contact, CreditCard, FileText, Globe,
  Handshake, Inbox, Kanban, LayoutDashboard, List, Lock, LogOut, Mail, Package, Plane, Search, Settings, Sparkles, Download, Phone, Activity, Plus, ShieldCheck,
  Ticket, TrendingUp, UserCog, Users, Wallet,
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const C = ICONS[name as IconName] ?? List;
  return <C size={18} strokeWidth={1.9} {...props} />;
}
