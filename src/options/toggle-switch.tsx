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
    <label className="relative inline-block h-6 w-12 shrink-0">
      <input
        id={id}
        type="checkbox"
        className="peer h-0 w-0 opacity-0"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="absolute inset-0 cursor-pointer rounded-[24px] bg-gray-555 transition duration-300 peer-checked:bg-brand before:absolute before:bottom-0.75 before:left-0.75 before:h-4.5 before:w-4.5 before:rounded-full before:bg-white before:transition before:duration-300 before:content-[''] peer-checked:before:translate-x-6" />
    </label>
  );
}
