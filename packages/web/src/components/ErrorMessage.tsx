interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div role="alert" style={{ color: "red", padding: "8px", border: "1px solid red" }}>
      {message}
    </div>
  );
}
