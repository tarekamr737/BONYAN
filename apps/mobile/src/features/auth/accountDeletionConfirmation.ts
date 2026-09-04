type ConfirmationCallbacks = {
  dismiss: () => void;
  removeAccount: () => void;
};

export function usesInlineAccountDeletionConfirmation(platform: string): boolean {
  return platform === "web";
}

export function accountDeletionConfirmationActions({
  dismiss,
  removeAccount,
}: ConfirmationCallbacks) {
  return {
    cancel: dismiss,
    confirm: () => {
      dismiss();
      removeAccount();
    },
  };
}
