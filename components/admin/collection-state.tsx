export function CollectionState({ loading, error, empty, emptyMessage }: { loading: boolean; error: string; empty: boolean; emptyMessage: string }) {
  if (loading) return <p role="status" className="p-6 text-sm text-muted-foreground">Loading…</p>
  if (error) return <p role="alert" className="p-6 text-sm text-destructive">{error}</p>
  if (empty) return <p className="p-6 text-sm text-muted-foreground">{emptyMessage}</p>
  return null
}
