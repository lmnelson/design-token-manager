'use client';

import React, { createContext, useContext, useCallback, useState, useMemo } from 'react';

interface ExpandedGroupsContextValue {
  expandedGroups: Set<string>;
  toggleGroup: (path: string) => void;
  expandAll: (groups: string[]) => void;
  collapseAll: () => void;
  isExpanded: (path: string) => boolean;
}

const ExpandedGroupsContext = createContext<ExpandedGroupsContextValue | null>(null);

interface ExpandedGroupsProviderProps {
  children: React.ReactNode;
  initialExpanded?: string[];
}

export function ExpandedGroupsProvider({
  children,
  initialExpanded = [],
}: ExpandedGroupsProviderProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(initialExpanded)
  );

  const toggleGroup = useCallback((path: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback((groups: string[]) => {
    setExpandedGroups(new Set(groups));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedGroups(new Set());
  }, []);

  const isExpanded = useCallback(
    (path: string) => expandedGroups.has(path),
    [expandedGroups]
  );

  const value = useMemo(
    () => ({
      expandedGroups,
      toggleGroup,
      expandAll,
      collapseAll,
      isExpanded,
    }),
    [expandedGroups, toggleGroup, expandAll, collapseAll, isExpanded]
  );

  return (
    <ExpandedGroupsContext.Provider value={value}>
      {children}
    </ExpandedGroupsContext.Provider>
  );
}

export function useExpandedGroups(): ExpandedGroupsContextValue {
  const context = useContext(ExpandedGroupsContext);
  if (!context) {
    throw new Error(
      'useExpandedGroups must be used within an ExpandedGroupsProvider'
    );
  }
  return context;
}

export { ExpandedGroupsContext };
