type RecordById<T extends { id: string }> = Record<string, T> & {
  [key: string]: T & { id: typeof key };
};
