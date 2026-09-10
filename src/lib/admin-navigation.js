// Shared labels keep the dashboard, sidebar, and mobile menu consistent.
export const ADMIN_NAV_SECTIONS = [
  { title: "Overview", items: [
    { label: "Dashboard", href: "/admin", icon: "fa-house", hint: "Choose what you want to update." },
    { label: "Messages", href: "/admin/contact/inbox", icon: "fa-inbox", hint: "Read messages from your visitors." },
  ] },
  { title: "Your website", items: [
    { label: "Home page", href: "/admin/home", icon: "fa-display", hint: "Edit your welcome text, photos, and introduction.", table: "section_home", singleton: true },
    { label: "About you", href: "/admin/about", icon: "fa-user", hint: "Tell your story and update your profile.", table: "section_about", singleton: true },
    { label: "Services", href: "/admin/services", icon: "fa-briefcase", hint: "Add or update the services you offer.", table: "service_items" },
    { label: "Projects", href: "/admin/portfolio", icon: "fa-images", hint: "Show your portfolio and work samples.", table: "portfolio_items" },
    { label: "Blog posts", href: "/admin/blog", icon: "fa-pen-nib", hint: "Write articles and manage your published posts.", table: "blog_posts" },
    { label: "Testimonials", href: "/admin/testimonials", icon: "fa-comment-dots", hint: "Manage client reviews and feedback.", table: "testimonial_items" },
    { label: "Pricing", href: "/admin/pricing", icon: "fa-tags", hint: "Update your packages, prices, and inclusions.", table: "package_items" },
    { label: "Contact details", href: "/admin/contact", icon: "fa-address-book", hint: "Update your email, social links, and booking details.", table: "section_contact_settings" },
  ] },
  { title: "Your background", items: [
    { label: "Work experience", href: "/admin/experience", icon: "fa-building", hint: "Add jobs and update your work history.", table: "experience_items" },
    { label: "Skills", href: "/admin/skills", icon: "fa-star", hint: "Highlight your strengths and abilities.", table: "skill_items" },
    { label: "Tools & software", href: "/admin/tools", icon: "fa-screwdriver-wrench", hint: "List the tools and software you use.", table: "tool_items" },
    { label: "Certifications", href: "/admin/certifications", icon: "fa-certificate", hint: "Add certificates and qualifications.", table: "certification_items" },
  ] },
  { title: "Website settings", items: [
    { label: "Site settings", href: "/admin/settings", icon: "fa-gear", hint: "Change branding, search appearance, and backgrounds." },
    { label: "Footer", href: "/admin/footer", icon: "fa-table-cells-large", hint: "Edit the text at the bottom of your website." },
    { label: "Chatbot answers", href: "/admin/chatbot-knowledge", icon: "fa-circle-question", hint: "Manage the answers your website assistant can give." },
    { label: "Chatbot conversations", href: "/admin/chatbot-logs", icon: "fa-comments", hint: "Read visitor conversations with your assistant." },
  ] },
];

export const ADMIN_NAV_ITEMS = ADMIN_NAV_SECTIONS.flatMap((section) => section.items);

export function getAdminPage(pathname) {
  return [...ADMIN_NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(`${item.href}/`)))
    || ADMIN_NAV_ITEMS[0];
}

export function matchesAdminSearch(item, query) {
  return `${item.label} ${item.hint} ${item.href}`.toLowerCase().includes(query.trim().toLowerCase());
}
