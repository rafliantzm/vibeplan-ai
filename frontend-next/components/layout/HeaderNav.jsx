"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { logoutUser } from "@/lib/api";
import { useAuthSession } from "@/lib/useAuthSession";

const BASE_NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/generate", label: "Generate" },
  { href: "/history", label: "History" },
  { href: "/about-team", label: "About Team" },
  { href: "/pricing", label: "Pricing" },
];

export default function HeaderNav() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const { user, token, isReady } = useAuthSession({ syncWithServer: true });
  const isMounted = isReady;

  useEffect(() => {
    if (!isProfileOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!profileRef.current?.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileOpen]);

  useEffect(() => {
    if (!isMounted) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setIsMobileMenuOpen(false);
      setIsProfileOpen(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isMounted, pathname]);

  const isLoggedIn = Boolean(token && user);
  const isAdmin = user?.role === "admin";
  const tokenBalance = getTokenBalance(user);

  const navItems = useMemo(() => BASE_NAV_ITEMS, []);

  async function handleLogout() {
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
    await logoutUser();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-white/90 backdrop-blur-xl shadow-sm">
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[76px] items-center justify-between gap-2 py-3 sm:gap-4">
          <BrandArea />

          <nav
            aria-label="Main navigation"
            className="hidden min-w-0 flex-1 justify-center lg:flex"
          >
            <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 p-1 shadow-sm shadow-slate-900/5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={getDesktopNavClass(isRouteActive(pathname, item.href))}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
            {!isMounted ? (
              <HeaderAccountPlaceholder />
            ) : !isLoggedIn ? (
              <div className="hidden sm:flex">
                <GuestActions />
              </div>
            ) : (
              <ProfileDropdown
                profileRef={profileRef}
                isAdmin={isAdmin}
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                onLogout={handleLogout}
                onToggle={() => {
                  setIsMobileMenuOpen(false);
                  setIsProfileOpen((current) => !current);
                }}
                user={user}
              />
            )}

            <button
              type="button"
              aria-label={isMobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
              onClick={() => {
                setIsProfileOpen(false);
                setIsMobileMenuOpen((current) => !current);
              }}
              aria-expanded={isMobileMenuOpen}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm shadow-slate-900/5 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-sky-200 lg:hidden"
            >
              <span className="flex flex-col gap-1.5">
                <span
                  className={`block h-0.5 w-5 rounded-full bg-current transition ${
                    isMobileMenuOpen ? "translate-y-2 rotate-45" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-5 rounded-full bg-current transition ${
                    isMobileMenuOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-5 rounded-full bg-current transition ${
                    isMobileMenuOpen ? "-translate-y-2 -rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        <div
          className={`absolute left-4 right-4 top-full z-[80] mt-3 transition-[opacity,transform] duration-200 lg:hidden ${
            isMobileMenuOpen
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-2 opacity-0"
          }`}
        >
          <div className="w-full rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-lg shadow-slate-900/5">
            <nav aria-label="Mobile navigation" className="grid gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={getMobileNavClass(isRouteActive(pathname, item.href))}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-4 border-t border-slate-200 pt-4">
              {!isMounted ? (
                <MobileAccountPlaceholder />
              ) : !isLoggedIn ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Link
                    href="/login"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsProfileOpen(false);
                    }}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsProfileOpen(false);
                    }}
                    className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-slate-900/20 transition hover:bg-slate-800"
                  >
                    Register
                  </Link>
                </div>
              ) : (
                <MobileUserPanel user={user} onClose={() => setIsMobileMenuOpen(false)} onLogout={handleLogout} />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function BrandArea() {
  return (
    <Link
      href="/"
      className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl px-1 py-1 transition hover:opacity-95 sm:gap-3 lg:flex-none"
    >
      <Image
        src="/brand/vibeplan-logo.png"
        alt="VibePlan AI Logo"
        width={44}
        height={44}
        className="h-10 w-10 rounded-2xl object-contain sm:h-11 sm:w-11"
        priority
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-tight text-slate-950 sm:text-lg">
          VibePlan AI
        </p>
        <p className="hidden truncate text-xs text-slate-500 sm:block">
          AI workspace untuk pemula coding
        </p>
      </div>
    </Link>
  );
}

function GuestActions() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
      >
        Login
      </Link>
      <Link
        href="/register"
        className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-slate-900/20 transition hover:bg-slate-800"
      >
        Register
      </Link>
    </div>
  );
}

function ProfileDropdown({
  user,
  isAdmin,
  isOpen,
  onToggle,
  onClose,
  onLogout,
  profileRef,
}) {
  const tokenBalance = getTokenBalance(user);

  return (
    <div ref={profileRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Buka menu profil"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-2 pr-2.5 shadow-sm shadow-slate-900/5 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200 sm:gap-3 sm:pr-3"
      >
        <AvatarBadge user={user} sizeClass="h-10 w-10" textClass="text-sm" />
        <span className="hidden min-w-0 text-left md:block">
          <span className="block truncate text-sm font-semibold text-slate-900">
            {getDisplayName(user)}
          </span>
          <span className="block text-[11px] text-slate-500">
            {isAdmin ? "Admin" : "Member"}
          </span>
        </span>
        <ChevronDownIcon isOpen={isOpen} />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="fixed inset-x-4 top-[5rem] z-[90] w-auto max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10 sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.75rem)] sm:w-80"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3">
            <AvatarBadge user={user} sizeClass="h-11 w-11" textClass="text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {getDisplayName(user)}
              </p>
              <p className="text-xs text-slate-500">
                {isAdmin ? "Admin Workspace" : "Member Workspace"}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-sky-700">
              Token tersedia
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {tokenBalance} Tokens tersedia
            </p>
          </div>

          <div className="mt-3 grid gap-1">
            <Link
              href="/profile"
              role="menuitem"
              onClick={onClose}
              className="inline-flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
            >
              Lihat Profil
            </Link>
          </div>

          {isAdmin ? (
            <div className="mt-3 border-t border-slate-200 pt-3">
              <p className="px-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Admin Menu
              </p>
              <div className="mt-2 grid gap-1">
                <DropdownLink href="/admin" label="Dashboard Admin" onClose={onClose} />
                <DropdownLink href="/admin/ai-settings" label="AI Settings" onClose={onClose} />
                <DropdownLink href="/admin/token-requests" label="Token Requests" onClose={onClose} />
                <DropdownLink href="/admin/support-conversations" label="Live Chat Support" onClose={onClose} />
                <DropdownLink href="/admin/users" label="User Management" onClose={onClose} />
              </div>
            </div>
          ) : null}

          <div className="mt-3 border-t border-slate-200 pt-3">
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              className="inline-flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DropdownLink({ href, label, onClose }) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClose}
      className="inline-flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
    >
      {label}
    </Link>
  );
}

function ChevronDownIcon({ isOpen }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  );
}

function DesktopAccountPlaceholder() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-2">
        <div className="h-9 w-9 rounded-full bg-slate-100" />
        <div className="hidden sm:block">
          <div className="h-3.5 w-20 rounded-full bg-slate-100" />
          <div className="mt-2 h-3 w-12 rounded-full bg-slate-100" />
        </div>
      </div>
      <div className="h-9 w-24 rounded-full bg-sky-50" />
      <div className="h-10 w-20 rounded-full border border-slate-200 bg-slate-50" />
    </div>
  );
}

function HeaderAccountPlaceholder() {
  return (
    <>
      <div className="hidden sm:flex">
        <DesktopAccountPlaceholder />
      </div>
      <div className="h-10 w-10 rounded-full border border-slate-200 bg-slate-100 sm:hidden" />
    </>
  );
}

function MobileAccountPlaceholder() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="h-11 rounded-full border border-slate-200 bg-slate-100" />
      <div className="h-11 rounded-full bg-slate-100" />
    </div>
  );
}

function MobileUserPanel({ user, onClose, onLogout }) {
  const tokenBalance = getTokenBalance(user);

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
        <AvatarBadge user={user} sizeClass="h-11 w-11" textClass="text-sm" shadowClass="shadow-sm shadow-slate-900/10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {getDisplayName(user)}
          </p>
          <p className="text-xs text-slate-500">
            {user?.role === "admin" ? "Admin" : "Member"}
          </p>
        </div>
        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
          {tokenBalance} Tokens
        </span>
      </div>

      <Link
        href="/profile"
        onClick={onClose}
        className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Lihat Profil
      </Link>

      {user?.role === "admin" ? (
        <div className="grid gap-2">
          <Link
            href="/admin"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Dashboard Admin
          </Link>
          <Link
            href="/admin/ai-settings"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            AI Settings
          </Link>
          <Link
            href="/admin/token-requests"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Token Requests
          </Link>
          <Link
            href="/admin/support-conversations"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Live Chat Support
          </Link>
          <Link
            href="/admin/users"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            User Management
          </Link>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onLogout}
        className="inline-flex items-center justify-center rounded-full border border-rose-200 px-4 py-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
      >
        Logout
      </button>
    </div>
  );
}

function AvatarBadge({
  user,
  sizeClass = "h-10 w-10",
  textClass = "text-sm",
  shadowClass = "",
}) {
  if (user?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar_url}
        alt={`Avatar ${user?.name || "user"}`}
        className={`${sizeClass} rounded-full object-cover ${shadowClass}`.trim()}
      />
    );
  }

  return (
    <span
      className={`flex items-center justify-center rounded-full bg-[linear-gradient(135deg,_#0f172a,_#4338ca,_#0ea5e9)] font-semibold text-white ${sizeClass} ${textClass} ${shadowClass}`.trim()}
    >
      {getUserInitial(user?.name)}
    </span>
  );
}

function isRouteActive(pathname, href) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/history") {
    return (
      pathname === "/history" ||
      pathname.startsWith("/history/") ||
      pathname.startsWith("/result/")
    );
  }

  if (href === "/admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getDesktopNavClass(isActive) {
  return [
    "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200",
    "focus:outline-none focus:ring-2 focus:ring-sky-200",
    isActive
      ? "bg-slate-950 text-white shadow-md shadow-slate-900/15"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
  ].join(" ");
}

function getMobileNavClass(isActive) {
  return [
    "inline-flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition",
    "focus:outline-none focus:ring-2 focus:ring-sky-200",
    isActive
      ? "bg-slate-950 text-white shadow-md shadow-slate-900/15"
      : "text-slate-700 hover:bg-slate-50",
  ].join(" ");
}

function getUserInitial(name) {
  if (!name || typeof name !== "string") {
    return "V";
  }

  return name.trim().charAt(0).toUpperCase() || "V";
}

function getDisplayName(user) {
  return user?.display_name || user?.displayName || user?.name || "User";
}

function getTokenBalance(user) {
  const value =
    user?.token_balance ??
    user?.tokenBalance ??
    user?.tokens ??
    user?.token ??
    0;

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}
