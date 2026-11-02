// Create-case draft shared by the three steps. It lives above the screens so input survives going
// back and forth and a failed submission (CREATE-13, SRS 17.2.6); it's cleared only after success.
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { CaseType, DocumentLookup, SubTypeForm } from '../../api/types';
import { emptyDraft, type CaseDraft } from '../../domain/case-validation';

type Ctx = {
  draft: CaseDraft;
  form: SubTypeForm | null;
  caseType: CaseType | null;
  /** Result of the order/invoice lookup or scan, reviewed on the Check details screen. */
  lookup: DocumentLookup | null;
  update: (fn: (d: CaseDraft) => CaseDraft) => void;
  setValue: (key: string, value: string) => void;
  start: (caseType: CaseType, subTypeId: string, form: SubTypeForm) => void;
  setLookup: (l: DocumentLookup | null) => void;
  reset: () => void;
};

const CreateCaseContext = createContext<Ctx | null>(null);

export function CreateCaseProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<CaseDraft>(emptyDraft);
  const [form, setForm] = useState<SubTypeForm | null>(null);
  const [caseType, setCaseType] = useState<CaseType | null>(null);
  const [lookup, setLookup] = useState<DocumentLookup | null>(null);

  const update = useCallback((fn: (d: CaseDraft) => CaseDraft) => setDraft(fn), []);
  const setValue = useCallback((key: string, value: string) => setDraft(d => ({ ...d, values: { ...d.values, [key]: value } })), []);

  // Changing the sub-type keeps contact details and text the user already typed.
  const start = useCallback((t: CaseType, subTypeId: string, f: SubTypeForm) => {
    setCaseType(t);
    setForm(f);
    setDraft(d => (d.subTypeId === subTypeId ? d : { ...emptyDraft(), caseTypeId: t.id, subTypeId, values: d.values }));
    setLookup(l => (form?.subTypeId === subTypeId ? l : null));
  }, [form?.subTypeId]);

  const reset = useCallback(() => {
    setDraft(emptyDraft());
    setForm(null);
    setCaseType(null);
    setLookup(null);
  }, []);

  const value = useMemo(() => ({ draft, form, caseType, lookup, update, setValue, start, setLookup, reset }), [draft, form, caseType, lookup, update, setValue, start, reset]);
  return <CreateCaseContext.Provider value={value}>{children}</CreateCaseContext.Provider>;
}

export function useCreateCase() {
  const ctx = useContext(CreateCaseContext);
  if (!ctx) throw new Error('useCreateCase outside CreateCaseProvider');
  return ctx;
}
