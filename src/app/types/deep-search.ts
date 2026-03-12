export interface DeepSearchChunk {
  type: "status" | "content" | "source" | "done" | "error";
  message?: string;
  text?: string;
  tool_name?: string;
  status?: string;
}

export interface DeepSearchSource {
  title: string;
  topic: string;
  date: string;
  filename: string;
}
