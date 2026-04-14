/**
 * Builds a workspace-aware href by injecting ?workspace=<workspaceKey> into the path.
 * Used by platform operators who need the workspace slug preserved across
 * all in-app navigation so server-side queries stay correctly scoped.
 */
export function buildWorkspaceHref(path: string, workspaceKey?: string | null) {
  if (!workspaceKey) {
    return path;
  }

  const [pathname, hashFragment = ""] = path.split("#", 2);
  const [basePath, queryString = ""] = pathname.split("?", 2);
  const params = new URLSearchParams(queryString);
  params.set("workspace", workspaceKey);

  const query = params.toString();
  const hash = hashFragment ? `#${hashFragment}` : "";
  return query ? `${basePath}?${query}${hash}` : `${basePath}${hash}`;
}
