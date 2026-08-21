import type { LucideIcon } from "lucide-react";
import {
  FolderKanban,
  LayoutDashboard,
  Mailbox,
  Package,
  Palette,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const adminNavItems: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    description: "Overview and quick actions",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/products",
    label: "Products",
    description: "Catalog, pricing, and images",
    icon: Package,
  },
  {
    href: "/admin/categories",
    label: "Categories",
    description: "Catalog organization",
    icon: FolderKanban,
  },
  {
    href: "/admin/appearance",
    label: "Appearance",
    description: "Branding, colors, and settings",
    icon: Palette,
  },
  {
    href: "/admin/inquiries",
    label: "Inquiries",
    description: "Customer requests and status",
    icon: Mailbox,
  },
];
