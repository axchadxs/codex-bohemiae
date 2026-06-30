import HistoriatedInitial from "./HistoriatedInitial";
import SourceCitation from "./SourceCitation";

interface UserMessageProps {
  role: "user";
  content: string;
}

interface AssistantMessageProps {
  role: "assistant";
  rubric: string;
  body: string;
  citation: string;
  isStreaming?: boolean;
}

type ChatMessageProps = UserMessageProps | AssistantMessageProps;

export default function ChatMessage(props: ChatMessageProps) {
  if (props.role === "user") {
    return <div className="user-message">{props.content}</div>;
  }

  const { rubric, body, citation, isStreaming } = props;
  const initial = body[0] ?? "";
  const rest = body.slice(1);

  return (
    <div className="ai-message-wrapper">
      {rubric && <p className="rubric">{rubric}</p>}
      <div className="ai-message">
        {initial && <HistoriatedInitial letter={initial} />}
        {rest}
        {isStreaming && <span className="streaming-cursor" aria-hidden="true" />}
      </div>
      {!isStreaming && citation && <SourceCitation citation={citation} />}
    </div>
  );
}
