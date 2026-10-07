export function ToggleSwitch({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="relative inline-block h-24 w-48 shrink-0">
      <input
        id={id}
        type="checkbox"
        className="peer h-0 w-0 opacity-0"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="absolute inset-0 cursor-pointer rounded-24 bg-gray-555 transition duration-300 peer-checked:bg-accent before:absolute before:bottom-3 before:left-3 before:h-18 before:w-18 before:rounded-full before:bg-white before:transition before:duration-300 before:content-[''] peer-checked:before:translate-x-24" />
    </label>
  );
}
