export interface MarkdownNoteFile {
  path: string;
  title: string;
  content: string;
}

export interface NoteFilePort {
  readNoteByPath(path: string): Promise<MarkdownNoteFile | null>;
  writeNote(path: string, content: string): Promise<void>;
  writeDraft(path: string, content: string): Promise<void>;
}
