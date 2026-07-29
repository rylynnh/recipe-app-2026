interface EmptyProps {
  title: string;
  description?: string;
}

export default function Empty({ title, description }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <h3 className="font-display text-lg text-secondary mb-2">{title}</h3>
      {description && <p className="text-sm text-secondary">{description}</p>}
    </div>
  );
}
