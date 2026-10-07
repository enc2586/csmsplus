import notes from "./patch-notes.json";

export function PatchNotesTab() {
  return (
    <div>
      {notes.map((note) => (
        <div
          key={note.version}
          className="relative mb-20 rounded-12 border border-gray-333 bg-dark-card p-24"
        >
          <div className="mb-12 flex items-center justify-between border-b border-white/5 pb-12">
            <span className="text-[1.2rem] font-bold text-accent">{note.version}</span>
            <span className="font-mono text-[0.9rem] text-gray-aaa">{note.date}</span>
          </div>
          <div>
            <p className="mb-12 text-[1.05rem] font-semibold text-gray-e0e0e0">{note.summary}</p>
            <ul>
              {note.changes.map((change) => (
                <li
                  key={change}
                  className="relative mb-6 pl-18 leading-[1.5] text-gray-aaa before:absolute before:left-0 before:content-['-']"
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
