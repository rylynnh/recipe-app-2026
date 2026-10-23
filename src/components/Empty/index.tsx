interface EmptyProps {
  title: string;
  description?: string;
}

export default function Empty({ title, description }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <h3 className="font-display text-lg text-secondary mb-2">{title}</h3>
      {description && <p className="max-w-sm text-sm leading-7 text-secondary">{description}</p>}
    </div>
  );
}
