interface CategoryChipProps {
  label: string;
  active?: boolean;
  onClick: () => void;
}

export function CategoryChip({ label, active = false, onClick }: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className={`chip ${active ? 'chip-active' : 'chip-inactive'}`}
    >
      {label}
    </button>
  );
}
