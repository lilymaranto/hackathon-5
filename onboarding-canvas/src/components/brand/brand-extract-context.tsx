"use client";

import type { BrandExtractPayload } from "@/lib/brand-extract-types";
import type { BrandColorFieldId } from "@/lib/brand-color-drag";
import {
  clearBrandExtractSession,
  loadBrandExtractSession,
  saveBrandExtractSession,
} from "@/lib/brand-extract-session";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type LogoApplier = (url: string) => void;

type BrandExtractContextValue = {
  results: BrandExtractPayload | null;
  setResults: (payload: BrandExtractPayload | null) => void;
  registerLogoApplier: (fn: LogoApplier | null) => void;
  applyLogoUrl: (url: string) => void;
  applyColor: (field: BrandColorFieldId, hex: string) => void;
  registerColorApplier: (field: BrandColorFieldId, fn: ((hex: string) => void) | null) => void;
};

const BrandExtractContext = createContext<BrandExtractContextValue | null>(null);

export function BrandExtractProvider({
  children,
  applyColor,
  storageScope,
}: {
  children: ReactNode;
  applyColor: (field: BrandColorFieldId, hex: string) => void;
  /** Config id or {@link BRAND_EXTRACT_CREATE_SCOPE} while creating. */
  storageScope: string;
}) {
  const [results, setResultsState] = useState<BrandExtractPayload | null>(null);
  const logoApplierRef = useRef<LogoApplier | null>(null);
  const colorAppliersRef = useRef<Partial<Record<BrandColorFieldId, (hex: string) => void>>>({});
  const storageScopeRef = useRef(storageScope);
  storageScopeRef.current = storageScope;

  useLayoutEffect(() => {
    setResultsState(loadBrandExtractSession(storageScope));
  }, [storageScope]);

  const setResults = useCallback((payload: BrandExtractPayload | null) => {
    setResultsState(payload);
    const scope = storageScopeRef.current;
    if (payload) saveBrandExtractSession(scope, payload);
    else clearBrandExtractSession(scope);
  }, []);

  const registerLogoApplier = useCallback((fn: LogoApplier | null) => {
    logoApplierRef.current = fn;
  }, []);

  const applyLogoUrl = useCallback((url: string) => {
    logoApplierRef.current?.(url);
  }, []);

  const registerColorApplier = useCallback(
    (field: BrandColorFieldId, fn: ((hex: string) => void) | null) => {
      if (fn) colorAppliersRef.current[field] = fn;
      else delete colorAppliersRef.current[field];
    },
    [],
  );

  const applyColorToField = useCallback(
    (field: BrandColorFieldId, hex: string) => {
      colorAppliersRef.current[field]?.(hex);
      applyColor(field, hex);
    },
    [applyColor],
  );

  const value = useMemo(
    (): BrandExtractContextValue => ({
      results,
      setResults,
      registerLogoApplier,
      applyLogoUrl,
      applyColor: applyColorToField,
      registerColorApplier,
    }),
    [results, setResults, registerLogoApplier, applyLogoUrl, applyColorToField, registerColorApplier],
  );

  return <BrandExtractContext.Provider value={value}>{children}</BrandExtractContext.Provider>;
}

export function useBrandExtract() {
  const ctx = useContext(BrandExtractContext);
  if (!ctx) {
    throw new Error("useBrandExtract must be used within BrandExtractProvider");
  }
  return ctx;
}

export function useOptionalBrandExtract() {
  return useContext(BrandExtractContext);
}

/** @deprecated Hydration is handled by {@link BrandExtractProvider} from `storageScope`. */
export function useBrandExtractHydrateOnMount() {
  useBrandExtract();
}
