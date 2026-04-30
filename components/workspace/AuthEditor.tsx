"use client";

import * as React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { useStore } from "@/lib/state/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { RequestModel } from "@/lib/domain/models";
import type {
  AuthType,
  AuthConfig,
  BearerAuth,
  BasicAuth,
  ApiKeyHeaderAuth,
  ApiKeyQueryAuth,
} from "@/types/auth";
import { gsap } from "gsap";
import { FiEye, FiEyeOff } from "react-icons/fi";

type Props = {
  req: RequestModel;
  colId: string;
};

const TYPES: { value: AuthType; label: string }[] = [
  { value: "none", label: "No Auth" },
  { value: "bearer", label: "Bearer Token" },
  { value: "basic", label: "Basic Auth" },
  { value: "api-key-header", label: "API Key (Header)" },
  { value: "api-key-query", label: "API Key (Query Param)" },
];

function isBearer(a: AuthConfig): a is BearerAuth {
  return a.type === "bearer";
}
function isBasic(a: AuthConfig): a is BasicAuth {
  return a.type === "basic";
}
function isApiKeyHeader(a: AuthConfig): a is ApiKeyHeaderAuth {
  return a.type === "api-key-header";
}
function isApiKeyQuery(a: AuthConfig): a is ApiKeyQueryAuth {
  return a.type === "api-key-query";
}

/**
 * SecretInput
 * -----------
 * Small helper to render a password/text input with an eye icon to toggle visibility.
 * - Keeps value controlled by parent.
 * - Adds right padding so the eye button doesn't overlap text.
 */
function SecretInput(props: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
  placeholder?: string;
  autoComplete?: string;
  "aria-label"?: string;
}) {
  const {
    id,
    value,
    onChange,
    className = "",
    placeholder,
    autoComplete = "off",
    "aria-label": ariaLabel,
  } = props;

  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-label={ariaLabel}
        className={`pr-9 ${className}`}
      />
      <button
        type="button"
        aria-label={visible ? "Hide value" : "Show value"}
        title={visible ? "Hide value" : "Show value"}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground focus:outline-none"
      >
        {visible ? <FiEyeOff size={16} /> : <FiEye size={16} />}
      </button>
    </div>
  );
}

/**
 * AuthEditor
 * ----------
 * - Animates after auth type changes (prevents “invisible inputs” flicker).
 * - Skips animation when the section is not visible and forces autoAlpha:1.
 * - Clears inline styles after animation to avoid stale opacity/transform.
 * - Adds eye icon toggles for secret fields (token, password, API keys).
 */
export function AuthEditor({ req, colId }: Props) {
  const { upsertRequest } = useStore();
  const auth: AuthConfig =
    (req.auth as AuthConfig) ?? ({ type: "none", enabled: true } as AuthConfig);

  const sectionRef = useRef<HTMLDivElement>(null);

  /** Merge and persist auth config. Ensures `enabled` is boolean. */
  function setAuth(next: Partial<AuthConfig>) {
    const merged = { ...auth, ...next } as AuthConfig;
    if (typeof (merged as any).enabled !== "boolean") {
      (merged as any).enabled = true;
    }
    upsertRequest(colId, { ...req, auth: merged });
  }

  /** Switches auth type; animation is handled in the effect below. */
  function switchType(t: AuthType) {
    if (t === "none") return setAuth({ type: "none", enabled: true });
    if (t === "bearer")
      return setAuth({
        type: "bearer",
        enabled: true,
        token: "",
        scheme: "Bearer",
      });
    if (t === "basic")
      return setAuth({
        type: "basic",
        enabled: true,
        username: "",
        password: "",
      });
    if (t === "api-key-header")
      return setAuth({
        type: "api-key-header",
        enabled: true,
        headerName: "X-API-Key",
        key: "",
      });
    if (t === "api-key-query")
      return setAuth({
        type: "api-key-query",
        enabled: true,
        paramName: "api_key",
        key: "",
      });
  }

  // Animate ONLY when the visible section changes type.
  useLayoutEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    // Always clear any stale inline styles first.
    gsap.set(node, { clearProps: "all", autoAlpha: 1, y: 0 });

    const prefersReduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;

    // If hidden (e.g., parent `display:none`), don't animate now.
    if (prefersReduced || node.offsetParent === null) {
      gsap.set(node, { autoAlpha: 1, y: 0, clearProps: "all" });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        node,
        { autoAlpha: 0, y: 8 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.25,
          ease: "power2.out",
          clearProps: "all",
        }
      );
    }, node);

    return () => ctx.revert();
  }, [auth.type]);

  return (
    <div className="space-y-6 p-4 sm:p-0">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2 min-w-0">
          <label className="text-sm font-medium sm:w-20 shrink-0">Type</label>
          <select
            value={auth.type}
            onChange={(e) => switchType(e.target.value as AuthType)}
            className="h-9 w-full sm:w-auto sm:min-w-48 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <label className="text-sm font-medium flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!auth.enabled}
            onChange={(e) => setAuth({ enabled: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          Enabled
        </label>
      </div>

      {/* Key the fields container by auth.type to force a clean remount per type */}
      <div key={auth.type} className="grid gap-4" ref={sectionRef}>
        {isBearer(auth) && (
          <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Scheme</label>
              <Input
                value={auth.scheme ?? "Bearer"}
                onChange={(e) => setAuth({ scheme: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Token</label>
              <SecretInput
                aria-label="Bearer token"
                value={auth.token ?? ""}
                onChange={(v) => setAuth({ token: v })}
                className="font-mono text-xs sm:text-sm"
                placeholder="Paste your token"
                autoComplete="off"
              />
            </div>
          </div>
        )}

        {isBasic(auth) && (
          <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Username</label>
              <Input
                value={auth.username ?? ""}
                onChange={(e) => setAuth({ username: e.target.value })}
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Password</label>
              <SecretInput
                aria-label="Password"
                value={auth.password ?? ""}
                onChange={(v) => setAuth({ password: v })}
                autoComplete="current-password"
              />
            </div>
          </div>
        )}

        {isApiKeyHeader(auth) && (
          <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Header Name</label>
              <Input
                value={auth.headerName ?? "X-API-Key"}
                onChange={(e) => setAuth({ headerName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Key</label>
              <SecretInput
                aria-label="API key (header)"
                value={auth.key ?? ""}
                onChange={(v) => setAuth({ key: v })}
                className="font-mono text-xs sm:text-sm"
                placeholder="Your API key"
                autoComplete="off"
              />
            </div>
          </div>
        )}

        {isApiKeyQuery(auth) && (
          <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">
                Parameter Name
              </label>
              <Input
                value={auth.paramName ?? "api_key"}
                onChange={(e) => setAuth({ paramName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Key</label>
              <SecretInput
                aria-label="API key (query param)"
                value={auth.key ?? ""}
                onChange={(v) => setAuth({ key: v })}
                className="font-mono text-xs sm:text-sm"
                placeholder="Your API key"
                autoComplete="off"
              />
            </div>
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAuth({ type: "none", enabled: true })}
          >
            Clear auth
          </Button>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="block sm:inline">
              If you set an{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                Authorization
              </code>
            </span>
            <span className="block sm:inline sm:ml-1">
              header manually, it will be respected and not overwritten.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
