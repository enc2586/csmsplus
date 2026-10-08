import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/shadcn/card.tsx";
import notes from "./patch-notes.json";

export function PatchNotesTab() {
  return (
    <div className="flex flex-col gap-4">
      {notes.map((note) => (
        <Card key={note.version}>
          <CardHeader>
            <CardTitle className="text-brand">{note.version}</CardTitle>
            <CardDescription className="font-mono">{note.date}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="font-medium">{note.summary}</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {note.changes.map((change) => (
                <li key={change} className="mb-1">
                  {change}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
