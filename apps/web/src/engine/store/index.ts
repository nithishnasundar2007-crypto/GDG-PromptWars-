// Owner: Uthai. The Repository interface every other engine module depends
// on instead of touching storage directly. Swapping InMemoryRepository for a
// real database later means writing one new class, not touching callers.

import type { Attempt, Company, Debrief, Gap, LadderState, Plan, Scope, Student } from "../../contracts";
import { companiesForScope, getQuestion } from "../content";

export interface Repository {
  getCompanies(scope?: Scope): Promise<Company[]>;
  getCompany(id: string, scope?: Scope): Promise<Company | undefined>;
  createStudent(input: Omit<Student, "id">): Promise<Student>;
  getStudent(id: string): Promise<Student | undefined>;
  saveLadder(ladder: LadderState): Promise<void>;
  getLadder(id: string): Promise<LadderState | undefined>;
  saveAttempt(attempt: Attempt): Promise<void>;
  /** Attempts in the order they were saved; optionally only those on questions of one topic. */
  getAttempts(studentId: string, topicId?: string): Promise<Attempt[]>;
  upsertGap(gap: Gap): Promise<void>;
  getGap(id: string): Promise<Gap | undefined>;
  getGaps(studentId: string): Promise<Gap[]>;
  savePlan(plan: Plan): Promise<void>;
  getPlan(studentId: string): Promise<Plan | undefined>;
  findPlanByItemId(itemId: string): Promise<Plan | undefined>;
  saveDebrief(debrief: Debrief): Promise<void>;
  /** A fresh id with the contract's prefix (ld_, att_, gap_, pi_, db_ ...). */
  nextId(prefix: string): string;
}

/** Enough for the MVP: everything lives in memory for the life of the page. */
export class InMemoryRepository implements Repository {
  private students = new Map<string, Student>();
  private ladders = new Map<string, LadderState>();
  private attempts: Attempt[] = [];
  private gaps = new Map<string, Gap>();
  private plans = new Map<string, Plan>();
  private debriefs: Debrief[] = [];
  private counters = new Map<string, number>();

  async getCompanies(scope: Scope = "sprint") {
    return companiesForScope(scope);
  }
  async getCompany(id: string, scope: Scope = "sprint") {
    return companiesForScope(scope).find((c) => c.id === id);
  }
  async createStudent(input: Omit<Student, "id">) {
    const student: Student = { ...input, id: this.nextId("st") };
    this.students.set(student.id, student);
    return student;
  }
  async getStudent(id: string) {
    return this.students.get(id);
  }
  async saveLadder(ladder: LadderState) {
    this.ladders.set(ladder.id, structuredClone(ladder));
  }
  async getLadder(id: string) {
    const ladder = this.ladders.get(id);
    return ladder ? structuredClone(ladder) : undefined;
  }
  async saveAttempt(attempt: Attempt) {
    this.attempts.push(structuredClone(attempt));
  }
  async getAttempts(studentId: string, topicId?: string) {
    return this.attempts
      .filter((a) => a.studentId === studentId && (!topicId || getQuestion(a.questionId)?.topicId === topicId))
      .map((a) => structuredClone(a));
  }
  async upsertGap(gap: Gap) {
    this.gaps.set(gap.id, structuredClone(gap));
  }
  async getGap(id: string) {
    const gap = this.gaps.get(id);
    return gap ? structuredClone(gap) : undefined;
  }
  async getGaps(studentId: string) {
    return [...this.gaps.values()].filter((g) => g.studentId === studentId).map((g) => structuredClone(g));
  }
  async savePlan(plan: Plan) {
    this.plans.set(plan.studentId, structuredClone(plan));
  }
  async getPlan(studentId: string) {
    const plan = this.plans.get(studentId);
    return plan ? structuredClone(plan) : undefined;
  }
  async findPlanByItemId(itemId: string) {
    for (const plan of this.plans.values()) {
      if (plan.days.some((d) => d.items.some((i) => i.id === itemId))) return structuredClone(plan);
    }
    return undefined;
  }
  async saveDebrief(debrief: Debrief) {
    this.debriefs.push(structuredClone(debrief));
  }
  nextId(prefix: string) {
    const n = (this.counters.get(prefix) ?? 0) + 1;
    this.counters.set(prefix, n);
    return `${prefix}_${n}`;
  }
}
