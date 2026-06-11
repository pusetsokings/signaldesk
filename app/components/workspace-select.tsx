"use client";

import { useEffect, useState } from "react";

export type CrmWorkspace = {
  id: string;
  name: string;
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

  return (
    <label>
      CRM workspace for pushed leads
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Default workspace</option>
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
    </label>
  );
}
