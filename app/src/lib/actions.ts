"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notifyDiscord } from "@/lib/discord";
import { formatDate, todayJst } from "@/lib/dates";
import type {
  EventType,
  EventVisibility,
  ExamType,
  Judgement,
  TaskStatus,
  UserRole,
  UserStatus,
} from "@/lib/database.types";

export type FormState = { error: string } | null;

// ---------------------------------------------------------------------------
// 認証
// ---------------------------------------------------------------------------

export async function signInWithEmail(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください。" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "メールアドレスまたはパスワードが正しくありません。" };
  }

  // open redirect 防止: アプリ内のパスのみ許可
  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// 招待の引換(F-4-4)
// ---------------------------------------------------------------------------

export async function redeemInvite(
  token: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) return { error: "表示名を入力してください。" };
  if (formData.get("consent") !== "on") {
    return { error: "データの取り扱いへの同意が必要です。" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_invitation", {
    p_token: token,
    p_display_name: displayName,
  });
  if (error) {
    if (error.message.includes("INVALID_INVITATION")) {
      return { error: "招待リンクが無効か、期限切れです。運営に再発行を依頼してください。" };
    }
    if (error.message.includes("ALREADY_REGISTERED")) {
      return { error: "このアカウントは登録済みです。" };
    }
    return { error: "登録に失敗しました。時間をおいて再度お試しください。" };
  }
  redirect("/");
}

// ---------------------------------------------------------------------------
// 課題・タスク(F-1)
// ---------------------------------------------------------------------------

export async function setTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assignment_tasks")
    .update({ status })
    .eq("id", taskId);
  if (error) return { error: "更新に失敗しました。" };
  revalidatePath("/", "layout");
  return null;
}

export async function saveTaskNote(
  taskId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const note = String(formData.get("progress_note") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase
    .from("assignment_tasks")
    .update({ progress_note: note || null })
    .eq("id", taskId);
  if (error) return { error: "保存に失敗しました。" };
  revalidatePath("/", "layout");
  return null;
}

export async function createAssignment(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const subjectId = String(formData.get("subject_id") ?? "");
  const dueDate = String(formData.get("due_date") ?? "");
  const studentIds = formData.getAll("students").map(String).filter(Boolean);

  if (!title) return { error: "タイトルを入力してください。" };
  if (!dueDate) return { error: "締切日を選択してください。" };
  if (studentIds.length === 0) {
    return { error: "割当先の生徒を1人以上選択してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインしてください。" };

  const { data: assignment, error } = await supabase
    .from("assignments")
    .insert({
      created_by: user.id,
      title,
      description: description || null,
      subject_id: subjectId || null,
      due_date: dueDate,
    })
    .select()
    .single();
  if (error || !assignment) return { error: "課題の作成に失敗しました。" };

  const { error: taskError } = await supabase.from("assignment_tasks").insert(
    studentIds.map((studentId) => ({
      assignment_id: assignment.id,
      student_id: studentId,
    })),
  );
  if (taskError) {
    // タスク割当に失敗した課題は残さない
    await supabase.from("assignments").delete().eq("id", assignment.id);
    return { error: "生徒への割当に失敗しました。" };
  }

  await notifyDiscord(
    `📚 新しい課題「${title}」が割り当てられました(締切: ${formatDate(dueDate)}、対象 ${studentIds.length} 名)。アプリで確認してください。`,
  );

  revalidatePath("/", "layout");
  redirect("/teacher");
}

export async function deleteAssignment(assignmentId: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId);
  if (error) return { error: "削除に失敗しました。" };
  revalidatePath("/", "layout");
  redirect("/teacher");
}

// ---------------------------------------------------------------------------
// 成績(F-2)
// ---------------------------------------------------------------------------

export type ScoreRowInput = {
  subjectId: string;
  score: number;
  maxScore: number;
  deviation: number | null;
  judgement: Judgement | null;
  note: string | null;
  topics: { topicId: string; score: number; maxScore: number }[];
};

export type RegisterScoresInput = {
  exam:
    | { kind: "existing"; id: string }
    | {
        kind: "new";
        name: string;
        examDate: string;
        type: ExamType;
        provider: string | null;
      };
  studentId: string;
  rows: ScoreRowInput[];
};

export async function registerScores(
  input: RegisterScoresInput,
): Promise<FormState> {
  if (input.rows.length === 0) {
    return { error: "科目を1つ以上入力してください。" };
  }
  for (const row of input.rows) {
    if (!row.subjectId) return { error: "科目が未選択の行があります。" };
    if (!(row.maxScore > 0) || row.score < 0 || row.score > row.maxScore) {
      return { error: "得点は 0〜満点 の範囲で入力してください。" };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインしてください。" };

  let examId: string;
  if (input.exam.kind === "existing") {
    examId = input.exam.id;
  } else {
    const name = input.exam.name.trim();
    if (!name) return { error: "テスト名を入力してください。" };
    if (!input.exam.examDate) return { error: "実施日を選択してください。" };
    const { data: exam, error } = await supabase
      .from("exams")
      .insert({
        name,
        exam_date: input.exam.examDate,
        type: input.exam.type,
        provider: input.exam.provider?.trim() || null,
        created_by: user.id,
      })
      .select()
      .single();
    if (error || !exam) return { error: "テストの作成に失敗しました。" };
    examId = exam.id;
  }

  const { data: scores, error: scoreError } = await supabase
    .from("exam_scores")
    .insert(
      input.rows.map((row) => ({
        exam_id: examId,
        student_id: input.studentId,
        subject_id: row.subjectId,
        score: row.score,
        max_score: row.maxScore,
        deviation: row.deviation,
        judgement: row.judgement,
        note: row.note?.trim() || null,
        registered_by: user.id,
      })),
    )
    .select();
  if (scoreError || !scores) {
    if (scoreError?.code === "23505") {
      return { error: "同じテスト・科目の成績が既に登録されています。" };
    }
    return { error: "成績の登録に失敗しました。権限と入力内容を確認してください。" };
  }

  const topicRows = input.rows.flatMap((row) => {
    const saved = scores.find((s) => s.subject_id === row.subjectId);
    if (!saved) return [];
    return row.topics
      .filter((t) => t.topicId)
      .map((t) => ({
        exam_score_id: saved.id,
        topic_id: t.topicId,
        score: t.score,
        max_score: t.maxScore,
      }));
  });
  if (topicRows.length > 0) {
    const { error: topicError } = await supabase
      .from("score_topics")
      .insert(topicRows);
    if (topicError) {
      return { error: "成績は登録されましたが、分野別得点の保存に失敗しました。" };
    }
  }

  revalidatePath("/", "layout");
  return null;
}

/** 分野タグの語彙追加(講師・運営のみ。RLS で強制) */
export async function createTopic(
  subjectId: string,
  name: string,
): Promise<{ error: string } | { id: string; name: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "分野名を入力してください。" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topics")
    .insert({ subject_id: subjectId, name: trimmed })
    .select()
    .single();
  if (error || !data) {
    return { error: "分野の追加に失敗しました(講師・運営のみ追加できます)。" };
  }
  return { id: data.id, name: data.name };
}

// ---------------------------------------------------------------------------
// 予定(F-3)
// ---------------------------------------------------------------------------

export async function createEvent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const type = String(formData.get("type") ?? "other") as EventType;
  const visibility = String(formData.get("visibility") ?? "all") as EventVisibility;
  const targets = formData.getAll("targets").map(String).filter(Boolean);

  if (!title) return { error: "タイトルを入力してください。" };
  if (!date) return { error: "日付を選択してください。" };
  if (visibility === "targeted" && targets.length === 0) {
    return { error: "限定公開の場合は対象の生徒を選択してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインしてください。" };

  const startsAt = `${date}T${time || "00:00"}:00+09:00`;
  const { data: event, error } = await supabase
    .from("events")
    .insert({ title, starts_at: startsAt, type, visibility, created_by: user.id })
    .select()
    .single();
  if (error || !event) {
    return { error: "予定の登録に失敗しました(講師・運営のみ登録できます)。" };
  }

  if (visibility === "targeted") {
    const { error: targetError } = await supabase.from("event_targets").insert(
      targets.map((studentId) => ({ event_id: event.id, student_id: studentId })),
    );
    if (targetError) {
      await supabase.from("events").delete().eq("id", event.id);
      return { error: "対象生徒の設定に失敗しました。" };
    }
  }

  revalidatePath("/calendar");
  redirect("/calendar");
}

// ---------------------------------------------------------------------------
// プロフィール(F-4-6)
// ---------------------------------------------------------------------------

export async function updateProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) return { error: "表示名を入力してください。" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインしてください。" };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      grade: String(formData.get("grade") ?? "").trim() || null,
      affiliation: String(formData.get("affiliation") ?? "").trim() || null,
    })
    .eq("id", user.id);
  if (error) return { error: "保存に失敗しました。" };
  revalidatePath("/", "layout");
  return null;
}

// ---------------------------------------------------------------------------
// 運営(F-4)
// ---------------------------------------------------------------------------

export type InvitationResult =
  | { error: string }
  | { token: string; role: UserRole };

export async function createInvitation(
  formData: FormData,
): Promise<InvitationResult> {
  const role = String(formData.get("role") ?? "student") as UserRole;
  const grade = String(formData.get("grade") ?? "").trim();
  const mentorId = String(formData.get("mentor_id") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインしてください。" };

  const { data, error } = await supabase
    .from("invitations")
    .insert({
      role,
      grade: grade || null,
      mentor_id: role === "student" && mentorId ? mentorId : null,
      created_by: user.id,
    })
    .select()
    .single();
  if (error || !data) {
    return { error: "招待の発行に失敗しました(運営のみ発行できます)。" };
  }
  revalidatePath("/admin");
  return { token: data.token, role: data.role };
}

export async function setUserStatus(
  userId: string,
  status: UserStatus,
): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_status", {
    p_user: userId,
    p_status: status,
  });
  if (error) return { error: "変更に失敗しました。" };
  revalidatePath("/admin");
  return null;
}

export async function addMentorship(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const teacherId = String(formData.get("teacher_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  if (!teacherId || !studentId) {
    return { error: "講師と生徒を選択してください。" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("mentorships")
    .insert({ teacher_id: teacherId, student_id: studentId });
  if (error) {
    if (error.code === "23505") return { error: "この担当関係は既に存在します。" };
    return { error: "担当関係の登録に失敗しました。" };
  }
  revalidatePath("/admin");
  return null;
}

export async function endMentorship(mentorshipId: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("mentorships")
    .update({ ended_on: todayJst() })
    .eq("id", mentorshipId);
  if (error) return { error: "担当解除に失敗しました。" };
  revalidatePath("/admin");
  return null;
}
