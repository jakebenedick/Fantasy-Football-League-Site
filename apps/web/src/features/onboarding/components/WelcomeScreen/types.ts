import type { FormEvent } from "react";

export type WelcomeScreenProps = {
  username: string;
  season: number;
  loading: boolean;
  error: string;
  onUsernameChange: (value: string) => void;
  onSeasonChange: (value: number) => void;
  onSubmit: (event: FormEvent) => void;
};
