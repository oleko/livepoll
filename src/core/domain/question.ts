export type QuestionRow = {
  id: string;
  text: string;
  status: "pending" | "answered" | "hidden";
  upvotes: number;
  poll_id?: string | null;
};
