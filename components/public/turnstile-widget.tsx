"use client";

import Script from "next/script";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { isLocalHostname, TURNSTILE_DUMMY_TOKEN } from "@/lib/turnstile";

type TurnstileWidgetProps = {
  siteKey: string;
  onTokenChange: (token: string | null) => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          "timeout-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

export type TurnstileWidgetHandle = {
  reset: () => void;
};

export const TurnstileWidget = forwardRef<
  TurnstileWidgetHandle,
  TurnstileWidgetProps
>(function TurnstileWidget({ siteKey, onTokenChange }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [useLocalStub, setUseLocalStub] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setUseLocalStub(!siteKey && isLocalHostname(window.location.hostname));
  }, [siteKey]);

  const renderWidget = useCallback(() => {
    if (
      useLocalStub
      || !scriptReady
      || !siteKey
      || !containerRef.current
      || !window.turnstile
      || widgetIdRef.current
    ) {
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token) => {
        onTokenChange(token);
      },
      "error-callback": () => {
        onTokenChange(null);
      },
      "expired-callback": () => {
        onTokenChange(null);
        window.turnstile?.reset(widgetIdRef.current ?? undefined);
      },
      "timeout-callback": () => {
        onTokenChange(null);
      },
    });
  }, [onTokenChange, scriptReady, siteKey, useLocalStub]);

  useEffect(() => {
    renderWidget();
  }, [renderWidget]);

  useEffect(() => {
    if (!useLocalStub) {
      return;
    }

    onTokenChange(TURNSTILE_DUMMY_TOKEN);
  }, [onTokenChange, useLocalStub]);

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    reset() {
      onTokenChange(useLocalStub ? TURNSTILE_DUMMY_TOKEN : null);

      if (widgetIdRef.current) {
        window.turnstile?.reset(widgetIdRef.current);
      }
    },
  }), [onTokenChange, useLocalStub]);

  if (useLocalStub) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Human verification is running in local test mode on localhost.
      </div>
    );
  }

  if (!siteKey) {
    return (
      <p className="text-sm text-muted-foreground">
        Human verification is temporarily unavailable.
      </p>
    );
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => {
          setScriptReady(true);
        }}
      />
      <div
        ref={containerRef}
        className="min-h-[66px]"
        aria-label="Human verification"
      />
    </>
  );
});
