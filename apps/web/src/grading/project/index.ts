// Owner: Suchit. generateProjectQuestions + gradeProjectAnswer (PRD F8).
// Questions must reference specific details from the pasted project text,
// not generic project questions — enforced by what's in the generator
// prompt's input, not by post-filtering here.

import type { GradeResult, ProjectCardItem, ProjectQuestion } from "../../contracts";
import { generate } from "../ai";
import { graderOutputSchema, projectQuestionGeneratorOutputSchema, verifierOutputSchema } from "../ai/schemas";
import { matchQuote } from "../quote";
import { explain } from "../pipeline";

let questionCounter = 0;

export async function generateProjectQuestions(projectText: string): Promise<ProjectQuestion[]> {
  const result = await generate(
    "project-question-generator",
    { projectText },
    projectQuestionGeneratorOutputSchema,
  );
  if (!result.ok) {
    throw new Error(`generateProjectQuestions failed: ${result.error.message}`);
  }
  return result.data.questions.map((q) => {
    questionCounter += 1;
    return {
      id: `pq_${questionCounter}`,
      area: q.area,
      text: q.text,
      rubric: q.rubric.map((r, i) => ({ id: `rpq_${questionCounter}_${i}`, text: r.text, required: r.required })),
    };
  });
}

export async function gradeProjectAnswer(
  pq: ProjectQuestion,
  projectText: string,
  answer: string,
): Promise<{ grade: GradeResult; card: ProjectCardItem }> {
  const graderResult = await generate(
    "grader",
    { question: pq.text, step: "explain", rubricPoints: pq.rubric, answer, context: projectText },
    graderOutputSchema,
  );

  const missing: string[] = [];
  const rubricResults = [];
  let allMet = true;

  for (const point of pq.rubric) {
    const spans = graderResult.ok
      ? (graderResult.data.points.find((p) => p.pointId === point.id)?.spans ?? [])
      : [];
    const quoteMatched = spans.length > 0 && spans.every((s) => matchQuote(s, answer).matched);
    let verifierYes = false;
    if (quoteMatched) {
      const verifierResult = await generate(
        "verifier",
        { point, spans },
        verifierOutputSchema,
      );
      verifierYes = verifierResult.ok && verifierResult.data.satisfied;
    }
    const met = quoteMatched && verifierYes;
    if (!met && point.required) {
      allMet = false;
      missing.push(point.text);
    }
    rubricResults.push({ pointId: point.id, spans, quoteMatched, verifierYes, met });
  }

  const grade: GradeResult = {
    step: "explain",
    passed: allMet,
    rubric: rubricResults,
    feedback: allMet
      ? undefined
      : await explain({ id: pq.id, topicId: "project", track: "technical", role: "probe", prompt: pq.text, rubrics: {}, targetTimeMs: {} }, "explain", answer, undefined),
  };

  const card: ProjectCardItem = {
    questionId: pq.id,
    strong: allMet,
    missing,
    modelOutline: allMet ? undefined : `Cover: ${missing.join("; ")}.`,
  };

  return { grade, card };
}
