import { type Document } from "./document";

export interface SearchResult {
  metadata: Document["metadata"];
  content: string;
  pageContent?: string;
}
