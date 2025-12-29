export function calculateATSScore(
  resumeText: string,
  jobDescription: string
) {
  const resume = resumeText.toLowerCase();
  const job = jobDescription.toLowerCase();

  const jobKeywords = job.split(/\W+/).filter(word => word.length > 3);
  let matched = 0;

  jobKeywords.forEach(keyword => {
    if (resume.includes(keyword)) {
      matched++;
    }
  });

  const score = Math.min(
    Math.round((matched / jobKeywords.length) * 100),
    100
  );

  return {
    score,
    matchedKeywords: matched,
    totalKeywords: jobKeywords.length,
    feedback: getFeedback(score),
  };
}

function getFeedback(score: number) {
  if (score >= 80) return "Excellent ATS compatibility";
  if (score >= 60) return "Good ATS match, minor improvements needed";
  if (score >= 40) return "Average ATS match";
  return "Low ATS score – resume needs improvement";
}
