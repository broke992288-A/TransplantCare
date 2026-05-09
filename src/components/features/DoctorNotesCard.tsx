import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, CalendarClock, Trash2, Clock } from "lucide-react";
import { useDoctorNotes, useDeleteDoctorNote } from "@/hooks/useDoctorNotes";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import AddDoctorNoteDialog from "@/components/features/AddDoctorNoteDialog";

interface Props {
  patientId: string;
  readOnly?: boolean;
}

const SEEN_KEY = (id: string) => `doctor-notes-last-seen-${id}`;

function useFormatRelative() {
  const { t } = useLanguage();
  return (dateStr: string): string => {
    const d = new Date(dateStr).getTime();
    const diffMs = Date.now() - d;
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return t("notes.now");
    if (min < 60) return `${min} ${t("time.minAgo")}`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} ${t("time.hourAgo")}`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days} ${t("time.dayAgo")}`;
    return new Date(dateStr).toLocaleDateString();
  };
}

export default function DoctorNotesCard({ patientId, readOnly = false }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const formatRelative = useFormatRelative();
  const { data: notes = [], isLoading } = useDoctorNotes(patientId, readOnly ? 10 : 3);
  const deleteNote = useDeleteDoctorNote(patientId);

  const lastSeen = readOnly
    ? Number(localStorage.getItem(SEEN_KEY(patientId)) ?? 0)
    : 0;

  const unreadCount = useMemo(() => {
    if (!readOnly) return 0;
    return notes.filter((n) => new Date(n.created_at).getTime() > lastSeen).length;
  }, [notes, lastSeen, readOnly]);

  const latestNote = notes[0];

  useEffect(() => {
    if (!readOnly || notes.length === 0) return;
    const tmr = setTimeout(() => {
      const newest = new Date(notes[0].created_at).getTime();
      localStorage.setItem(SEEN_KEY(patientId), String(newest));
    }, 3000);
    return () => clearTimeout(tmr);
  }, [readOnly, notes, patientId]);

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync(noteId);
      toast({ title: t("notes.deleted") });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{t("notes.title")}</CardTitle>
            {notes.length > 0 && (
              <Badge variant="secondary">{notes.length}</Badge>
            )}
            {readOnly && unreadCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {unreadCount} {t("notes.new")}
              </Badge>
            )}
          </div>
          {!readOnly && <AddDoctorNoteDialog patientId={patientId} />}
        </div>
        {readOnly && latestNote && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" />
            {t("notes.lastEntry")} {formatRelative(latestNote.created_at)}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("notes.loading")}</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("notes.empty")}</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => {
              const isUnread = readOnly && new Date(note.created_at).getTime() > lastSeen;
              return (
                <div
                  key={note.id}
                  className={`rounded-lg border p-3 space-y-2 ${
                    isUnread ? "border-primary/40 bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(note.created_at).toLocaleDateString()}{" "}
                        {new Date(note.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
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
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">{t("notes.assessment")}</p>
                      <p className="text-sm">{note.assessment}</p>
                    </div>
                  )}
                  {note.plan && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">{t("notes.plan")}</p>
                      <p className="text-sm">{note.plan}</p>
                    </div>
                  )}
                  {note.follow_up_date && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {t("notes.followUp")}: {new Date(note.follow_up_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
