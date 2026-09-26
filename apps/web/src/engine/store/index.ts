// Owner: Uthai. The Repository interface every other engine module depends
// on instead of touching storage directly. Swapping InMemoryRepository for a
// real database later means writing one new class, not touching callers.

import type { Attempt, Company, Debrief, Gap, LadderState, Plan, Student } from "../../contracts";

export interface Repository {
  getCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createStudent(input: Omit<Student, "id">): Promise<Student>;
  getStudent(id: string): Promise<Student | undefined>;
  saveLadder(ladder: LadderState): Promise<void>;
  getLadder(id: string): Promise<LadderState | undefined>;
  saveAttempt(attempt: Attempt): Promise<void>;
  getAttempts(studentId: string, topicId?: string): Promise<Attempt[]>;
  upsertGap(gap: Gap): Promise<void>;
  getGaps(studentId: string): Promise<Gap[]>;
  savePlan(plan: Plan): Promise<void>;
  getPlan(studentId: string): Promise<Plan | undefined>;
  saveDebrief(debrief: Debrief): Promise<void>;
}

/**
 * M0 scaffold only: enough to type-check and to back the mock-free dev path
 * once M1 wires it up. Uthai: replace bodies as each engine module needs
 * them; the localStorage-backed variant (or a real DB later) implements the
 * same interface.
 */
export class InMemoryRepository implements Repository {
  private companies: Company[] = [];
  private students = new Map<string, Student>();
  private ladders = new Map<string, LadderState>();
  private attempts: Attempt[] = [];
  private gaps: Gap[] = [];
  private plans = new Map<string, Plan>();
  private debriefs: Debrief[] = [];

  async getCompanies() {
    return this.companies;
  }
  async getCompany(id: string) {
    return this.companies.find((c) => c.id === id);
  }
  async createStudent(input: Omit<Student, "id">) {
    const student: Student = { ...input, id: `st_${this.students.size + 1}` };
    this.students.set(student.id, student);
    return student;
  }
  async getStudent(id: string) {
    return this.students.get(id);
  }
  async saveLadder(ladder: LadderState) {
    this.ladders.set(ladder.id, ladder);
  }
  async getLadder(id: string) {
    return this.ladders.get(id);
  }
  async saveAttempt(attempt: Attempt) {
    this.attempts.push(attempt);
  }
  async getAttempts(studentId: string, topicId?: string) {
    return this.attempts.filter(
      (a) => a.studentId === studentId && (!topicId || a.questionId.startsWith(topicId)),
    );
  }
  async upsertGap(gap: Gap) {
    const idx = this.gaps.findIndex((g) => g.id === gap.id);
    if (idx >= 0) this.gaps[idx] = gap;
    else this.gaps.push(gap);
  }
  async getGaps(studentId: string) {
    return this.gaps.filter((g) => g.studentId === studentId);
  }
  async savePlan(plan: Plan) {
    this.plans.set(plan.studentId, plan);
  }
  async getPlan(studentId: string) {
    return this.plans.get(studentId);
  }
  async saveDebrief(debrief: Debrief) {
    this.debriefs.push(debrief);
  }
}
