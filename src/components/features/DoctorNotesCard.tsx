import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, CalendarClock, Trash2 } from "lucide-react";
import { useDoctorNotes, useDeleteDoctorNote } from "@/hooks/useDoctorNotes";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AddDoctorNoteDialog from "@/components/features/AddDoctorNoteDialog";

interface Props {
  patientId: string;
  readOnly?: boolean;
}

export default function DoctorNotesCard({ patientId, readOnly = false }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: notes = [], isLoading } = useDoctorNotes(patientId, readOnly ? 10 : 3);
  const deleteNote = useDeleteDoctorNote(patientId);

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync(noteId);
      toast({ title: "Note deleted" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Doctor Notes</CardTitle>
            {notes.length > 0 && (
              <Badge variant="secondary">{notes.length}</Badge>
            )}
          </div>
          <AddDoctorNoteDialog patientId={patientId} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet. Add the first clinical note.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <p className="text-xs text-muted-foreground">
                    {new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {user?.id === note.doctor_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(note.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {note.assessment && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Assessment</p>
                    <p className="text-sm">{note.assessment}</p>
                  </div>
                )}
                {note.plan && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Plan</p>
                    <p className="text-sm">{note.plan}</p>
                  </div>
                )}
                {note.follow_up_date && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Follow-up: {new Date(note.follow_up_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
