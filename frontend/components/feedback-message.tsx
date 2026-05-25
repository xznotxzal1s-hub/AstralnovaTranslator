type FeedbackMessageProps = {
  message: string;
  type?: "success" | "error" | "";
};

export function FeedbackMessage({ message, type = "" }: FeedbackMessageProps) {
  if (!message) {
    return null;
  }

  return <p className={`feedback${type ? ` ${type}` : ""}`}>{message}</p>;
}
