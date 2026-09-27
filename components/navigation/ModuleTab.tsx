import { Redirect, useLocalSearchParams } from "expo-router";
import React from "react";

import { useNavigationAccess, type MoreEntry } from "../../hooks/useNavigationAccess";

interface ModuleTabProps {
  name: MoreEntry;
  children: React.ReactElement;
}

/**
 * The tab screen of a module that some roles reach from Más instead. Renders the module
 * when it is a tab for this role; otherwise sends the visitor to the copy under Más,
 * keeping the `section` deep-link parameter, so every old address still works.
 */
export default function ModuleTab({ name, children }: ModuleTabProps) {
  const { isTab, loading } = useNavigationAccess();
  const { section } = useLocalSearchParams<{ section?: string }>();
  if (!loading && !isTab(name)) {
    return <Redirect href={{ pathname: `/(tabs)/more/${name}`, params: section ? { section } : {} }} />;
  }
  return children;
}
