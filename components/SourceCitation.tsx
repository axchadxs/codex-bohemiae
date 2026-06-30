interface SourceCitationProps {
  citation: string;
}

export default function SourceCitation({ citation }: SourceCitationProps) {
  return <p className="source-citation">† {citation}</p>;
}
