import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DeleteWithUndoOptions {
  deleteFn: () => Promise<void>;
  restoreFn: () => Promise<void>;
  queryKey: unknown[];
  label: string;
}

export function useDeleteWithUndo() {
  const queryClient = useQueryClient();

  return async ({ deleteFn, restoreFn, queryKey, label }: DeleteWithUndoOptions) => {
    try {
      await deleteFn();
    } catch {
      toast.error(`Fehler beim Löschen des ${label}s`);
      return;
    }

    await queryClient.invalidateQueries({ queryKey });

    toast(`${label} gelöscht`, {
      duration: 10000,
      action: {
        label: 'Rückgängig',
        onClick: async () => {
          try {
            await restoreFn();
            await queryClient.invalidateQueries({ queryKey });
            toast.success(`${label} wiederhergestellt`);
          } catch {
            toast.error(`Fehler beim Wiederherstellen des ${label}s`);
          }
        },
      },
    });
  };
}
