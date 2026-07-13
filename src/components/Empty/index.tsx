interface EmptyProps {
  title: string;
  description?: string;
}

export default function Empty({ title, description }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-16 h-16 rounded-full bg-divider/30 flex items-center justify-center mb-4">
        <span className="text-3xl text-secondary">{title[0]}</span>
      </div>
      <h3 className="font-display text-lg text-secondary mb-2">{title}</h3>
      {description && <p className="text-sm text-secondary">{description}</p>}
    </div>
  );
}
