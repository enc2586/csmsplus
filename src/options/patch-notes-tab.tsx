import notes from "./patch-notes.json";

export function PatchNotesTab() {
  return (
    <div>
      {notes.map((note) => (
        <div
          key={note.version}
          className="relative mb-5 rounded-[12px] border border-gray-333 bg-dark-card p-6"
        >
          <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-[1.2rem] font-bold text-brand">{note.version}</span>
            <span className="font-mono text-[0.9rem] text-gray-aaa">{note.date}</span>
          </div>
          <div>
            <p className="mb-3 text-[1.05rem] font-semibold text-gray-e0e0e0">{note.summary}</p>
            <ul>
              {note.changes.map((change) => (
                <li
                  key={change}
                  className="relative mb-1.5 pl-4.5 leading-normal text-gray-aaa before:absolute before:left-0 before:content-['-']"
                >
                  {change}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
