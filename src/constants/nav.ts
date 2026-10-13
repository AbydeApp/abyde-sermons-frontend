import {
  BookOpen,
  CalendarDays,
  CreditCard,
  FileText,
  LayoutDashboard,
  Library,
  Palette,
  Plus,
  Settings,
  Share2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "New Sermon", href: "/sermons/new", icon: Plus },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Sermons", href: "/sermons", icon: BookOpen },
      { label: "Content", href: "/content", icon: FileText },
      // { label: "Calendar", href: "/calendar", icon: CalendarDays },
      { label: "Brand Studio", href: "/brand-studio", icon: Palette },
      { label: "Library", href: "/library", icon: Library },
    ],
  },
  {
    title: "Manage",
    items: [
      { label: "Social Accounts", href: "/social-accounts", icon: Share2 },
      { label: "Billing", href: "/billing", icon: CreditCard },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];
