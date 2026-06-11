"use client";

import { useEffect, useState } from "react";

export type CrmWorkspace = {
  id: string;
  name: string;
  offerName?: string | null;
  icp?: string | null;
};

export function useCrmWorkspaces() {
  const [workspaces, setWorkspaces] = useState<CrmWorkspace[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/crm/workspaces")
      .then((response) => response.json())
      .then((data: { ok: boolean; workspaces: CrmWorkspace[] }) => {
        if (!cancelled && data.ok) setWorkspaces(data.workspaces);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return workspaces;
}

export function WorkspaceSelect({
  workspaces,
  value,
  onChange
}: {
  workspaces: CrmWorkspace[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (workspaces.length === 0) return null;

  const selected = workspaces.find((workspace) => workspace.id === value);

  return (
    <label>
      CRM workspace for pushed leads
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Default workspace</option>
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
            {workspace.offerName ? ` — ${workspace.offerName}` : ""}
          </option>
        ))}
      </select>
      {selected?.icp ? (
        <span className="workspaceIcp">
          This workspace&apos;s ICP: {selected.icp}. Push signals that match it.
        </span>
      ) : null}
    </label>
  );
}
