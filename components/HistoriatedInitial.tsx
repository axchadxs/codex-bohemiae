interface HistoriatedInitialProps {
  letter: string;
}

export default function HistoriatedInitial({ letter }: HistoriatedInitialProps) {
  return (
    <div className="historiated-initial">
      <span className="initial-corner tl">◆</span>
      <span className="initial-corner tr">◆</span>
      <span className="initial-corner bl">◆</span>
      <span className="initial-corner br">◆</span>
      <span className="historiated-letter">{letter}</span>
    </div>
  );
}
